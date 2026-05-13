import { createHash, createHmac } from "node:crypto";

import type { ServiceRecord } from "../schemas/index.js";
import { maskKnownSecretsInText } from "../vault/index.js";

export type ConnectionTestStatus = "passed" | "failed" | "skipped";

export type ConnectionTestResult = {
  status: ConnectionTestStatus;
  ok: boolean;
  message: string;
  latencyMs?: number;
};

type OpenAICompatibleSpec = {
  type: "openai_compatible_chat";
  baseUrl: string;
  envKey: string;
  modelHint?: string;
};

type HttpSpec = {
  type: "http";
  url: string;
  method?: "GET" | "POST" | "HEAD";
  expectedStatus?: number;
};

type SupabaseSpec = {
  type: "supabase";
  urlEnvKey: string;
  anonKeyEnvKey: string;
};

type S3CompatibleSpec = {
  type: "s3_compatible";
  endpointEnvKey: string;
  accessKeyEnvKey: string;
  secretKeyEnvKey: string;
  bucketEnvKey?: string;
};

type ManualSpec = {
  type: "manual";
  reason?: string;
};

type TestSpec = OpenAICompatibleSpec | HttpSpec | SupabaseSpec | S3CompatibleSpec | ManualSpec;

export type ConnectionTestAdapters = {
  openaiCompatibleChat?: (spec: OpenAICompatibleSpec, env: Record<string, string>) => Promise<ConnectionTestResult>;
  http?: (spec: HttpSpec, env: Record<string, string>) => Promise<ConnectionTestResult>;
  supabase?: (spec: SupabaseSpec, env: Record<string, string>) => Promise<ConnectionTestResult>;
  s3Compatible?: (spec: S3CompatibleSpec, env: Record<string, string>) => Promise<ConnectionTestResult>;
};

export type ConnectionTestFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type RunConnectionTestOptions = {
  service: ServiceRecord;
  env: Record<string, string>;
  adapters?: ConnectionTestAdapters;
  fetch?: ConnectionTestFetch;
};

export async function runConnectionTest(options: RunConnectionTestOptions): Promise<ConnectionTestResult> {
  const spec = options.service.config?.test as TestSpec | undefined;
  if (!spec || spec.type === "manual") {
    return {
      status: "skipped",
      ok: true,
      message: spec?.type === "manual" && spec.reason ? spec.reason : "Connection test is not supported for this service."
    };
  }

  let result: ConnectionTestResult;
  try {
    result = await dispatchTest(
      spec,
      options.env,
      options.adapters ?? {},
      options.fetch ?? globalThis.fetch.bind(globalThis)
    );
  } catch (error) {
    result = failed(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    ...result,
    message: maskKnownSecretsInText(result.message)
  };
}

async function dispatchTest(
  spec: Exclude<TestSpec, ManualSpec>,
  env: Record<string, string>,
  adapters: ConnectionTestAdapters,
  fetcher: ConnectionTestFetch
): Promise<ConnectionTestResult> {
  switch (spec.type) {
    case "openai_compatible_chat":
      return adapters.openaiCompatibleChat?.(spec, env) ?? testOpenAICompatibleChat(spec, env, fetcher);
    case "http":
      return adapters.http?.(spec, env) ?? testHttp(spec, env, fetcher);
    case "supabase":
      return adapters.supabase?.(spec, env) ?? testSupabase(spec, env, fetcher);
    case "s3_compatible":
      return adapters.s3Compatible?.(spec, env) ?? testS3Compatible(spec, env, fetcher);
  }
}

async function testOpenAICompatibleChat(
  spec: OpenAICompatibleSpec,
  env: Record<string, string>,
  fetcher: ConnectionTestFetch
): Promise<ConnectionTestResult> {
  const apiKey = env[spec.envKey];
  if (!apiKey) {
    return failed(`Missing required env value: ${spec.envKey}.`);
  }

  const startedAt = Date.now();
  const response = await fetcher(`${trimTrailingSlash(spec.baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: spec.modelHint ?? "default",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1
    })
  });

  return resultFromStatus(response.status, response.ok, "OpenAI-compatible chat", Date.now() - startedAt);
}

async function testHttp(
  spec: HttpSpec,
  env: Record<string, string>,
  fetcher: ConnectionTestFetch
): Promise<ConnectionTestResult> {
  const resolvedUrl = resolveEnvTemplate(spec.url, env);
  if (!resolvedUrl.ok) {
    return failed(resolvedUrl.message);
  }

  const expectedStatus = spec.expectedStatus ?? 200;
  const method = spec.method ?? "GET";
  const startedAt = Date.now();
  const response = await fetcher(resolvedUrl.value, { method });
  const ok = response.status === expectedStatus;

  return {
    status: ok ? "passed" : "failed",
    ok,
    message: ok
      ? `HTTP ${method} returned expected status ${expectedStatus}.`
      : `HTTP ${method} returned status ${response.status}; expected ${expectedStatus}.`,
    latencyMs: Date.now() - startedAt
  };
}

async function testSupabase(
  spec: SupabaseSpec,
  env: Record<string, string>,
  fetcher: ConnectionTestFetch
): Promise<ConnectionTestResult> {
  const url = env[spec.urlEnvKey];
  if (!url) {
    return failed(`Missing required env value: ${spec.urlEnvKey}.`);
  }
  const anonKey = env[spec.anonKeyEnvKey];
  if (!anonKey) {
    return failed(`Missing required env value: ${spec.anonKeyEnvKey}.`);
  }

  const startedAt = Date.now();
  const response = await fetcher(`${trimTrailingSlash(url)}/rest/v1/`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`
    }
  });

  return resultFromStatus(response.status, response.ok, "Supabase REST", Date.now() - startedAt);
}

async function testS3Compatible(
  spec: S3CompatibleSpec,
  env: Record<string, string>,
  fetcher: ConnectionTestFetch
): Promise<ConnectionTestResult> {
  const endpoint = env[spec.endpointEnvKey];
  if (!endpoint) {
    return failed(`Missing required env value: ${spec.endpointEnvKey}.`);
  }
  const accessKey = env[spec.accessKeyEnvKey];
  if (!accessKey) {
    return failed(`Missing required env value: ${spec.accessKeyEnvKey}.`);
  }
  const secretKey = env[spec.secretKeyEnvKey];
  if (!secretKey) {
    return failed(`Missing required env value: ${spec.secretKeyEnvKey}.`);
  }
  const bucket = spec.bucketEnvKey ? env[spec.bucketEnvKey] : undefined;
  if (spec.bucketEnvKey && !bucket) {
    return failed(`Missing required env value: ${spec.bucketEnvKey}.`);
  }

  const targetUrl = buildS3TargetUrl(endpoint, bucket);
  const amzDate = formatAmzDate(new Date());
  const payloadHash = "UNSIGNED-PAYLOAD";
  const startedAt = Date.now();
  const response = await fetcher(targetUrl.toString(), {
    method: "HEAD",
    headers: {
      authorization: buildS3AuthorizationHeader({
        accessKey,
        secretKey,
        method: "HEAD",
        url: targetUrl,
        amzDate,
        payloadHash
      }),
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    }
  });

  return resultFromStatus(response.status, response.ok, "S3-compatible endpoint", Date.now() - startedAt);
}

function failed(message: string): ConnectionTestResult {
  return { status: "failed", ok: false, message };
}

function resultFromStatus(
  status: number,
  ok: boolean,
  label: string,
  latencyMs: number
): ConnectionTestResult {
  return {
    status: ok ? "passed" : "failed",
    ok,
    message: ok ? `${label} test passed.` : `${label} test failed with status ${status}.`,
    latencyMs
  };
}

function resolveEnvTemplate(template: string, env: Record<string, string>): { ok: true; value: string } | { ok: false; message: string } {
  let missing: string | undefined;
  const value = template.replace(/\$\{([A-Z][A-Z0-9_]+)\}/g, (_match, key: string) => {
    const envValue = env[key];
    if (!envValue) {
      missing = key;
      return "";
    }
    return encodeURIComponent(envValue);
  });

  if (missing) {
    return { ok: false, message: `Missing required env value: ${missing}.` };
  }
  return { ok: true, value };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildS3TargetUrl(endpoint: string, bucket?: string): URL {
  const url = new URL(endpoint);
  if (bucket) {
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    url.pathname = `${path}/${encodeURIComponent(bucket)}`;
  }
  return url;
}

function buildS3AuthorizationHeader(options: {
  accessKey: string;
  secretKey: string;
  method: "HEAD";
  url: URL;
  amzDate: string;
  payloadHash: string;
  region?: string;
}): string {
  const algorithm = "AWS4-HMAC-SHA256";
  const region = options.region ?? "auto";
  const service = "s3";
  const dateStamp = options.amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    options.method,
    options.url.pathname || "/",
    canonicalQueryString(options.url),
    [
      `host:${options.url.host}`,
      `x-amz-content-sha256:${options.payloadHash}`,
      `x-amz-date:${options.amzDate}`,
      ""
    ].join("\n"),
    signedHeaders,
    options.payloadHash
  ].join("\n");
  const stringToSign = [
    algorithm,
    options.amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signature = hmacHex(
    deriveS3SigningKey(options.secretKey, dateStamp, region, service),
    stringToSign
  );

  return [
    `${algorithm} Credential=${options.accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");
}

function canonicalQueryString(url: URL): string {
  const params = [...url.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    );
  return params
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function deriveS3SigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const dateKey = hmacBuffer(`AWS4${secretKey}`, dateStamp);
  const regionKey = hmacBuffer(dateKey, region);
  const serviceKey = hmacBuffer(regionKey, service);
  return hmacBuffer(serviceKey, "aws4_request");
}

function hmacBuffer(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key: string | Buffer, value: string): string {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
