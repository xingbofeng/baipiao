import { describe, expect, it } from "vitest";

import { loadServiceConfigs } from "../registry/configs.js";
import { runConnectionTest } from "./index.js";

describe("connection tester", () => {
  it("runs openai-compatible tests with the default fetch adapter", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

    const result = await runConnectionTest({
      service: groq!,
      env: { GROQ_API_KEY: "gsk_abcdefghijklmnopqrstuvwxyz1234" },
      fetch: (url, init) => {
        requests.push({ url: String(url), init });
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
    });

    expect(result).toMatchObject({
      status: "passed",
      ok: true
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(requests[0]?.init?.method).toBe("POST");
    expect(JSON.stringify(requests[0]?.init?.headers)).toContain("Bearer gsk_abcdefghijklmnopqrstuvwxyz1234");
    expect(result.message).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("fails supported tests when required env values are missing", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");

    await expect(runConnectionTest({ service: groq!, env: {} })).resolves.toMatchObject({
      status: "failed",
      ok: false,
      message: "Missing required env value: GROQ_API_KEY."
    });
  });

  it("runs HTTP specs with env placeholder substitution", async () => {
    const services = await loadServiceConfigs();
    const gemini = services.find((service) => service.id === "gemini");
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

    const result = await runConnectionTest({
      service: gemini!,
      env: { GEMINI_API_KEY: "gemini-key-without-known-prefix" },
      fetch: (url, init) => {
        requests.push({ url: String(url), init });
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
    });

    expect(result).toMatchObject({ status: "passed", ok: true });
    expect(requests[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models?key=gemini-key-without-known-prefix");
    expect(requests[0]?.init?.method).toBe("GET");
    expect(result.message).not.toContain("gemini-key-without-known-prefix");
  });

  it("returns a failed result instead of throwing when fetch fails", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");

    const result = await runConnectionTest({
      service: groq!,
      env: { GROQ_API_KEY: "gsk_abcdefghijklmnopqrstuvwxyz1234" },
      fetch: () => Promise.reject(new Error("network rejected gsk_abcdefghijklmnopqrstuvwxyz1234"))
    });

    expect(result).toMatchObject({
      status: "failed",
      ok: false
    });
    expect(result.message).toContain("Connection test failed");
    expect(result.message).toContain("gsk_**************************1234");
    expect(result.message).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("signs S3-compatible requests with AWS SigV4 without exposing the secret key", async () => {
    const services = await loadServiceConfigs();
    const r2 = services.find((service) => service.id === "cloudflare-r2");
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

    const result = await runConnectionTest({
      service: r2!,
      env: {
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        R2_ACCESS_KEY_ID: "access-key-id",
        R2_SECRET_ACCESS_KEY: "secret-access-key",
        R2_BUCKET_NAME: "demo-bucket"
      },
      fetch: (url, init) => {
        requests.push({ url: String(url), init });
        return Promise.resolve(new Response(null, { status: 200 }));
      }
    });

    const headers = requests[0]?.init?.headers as Record<string, string>;
    expect(result).toMatchObject({ status: "passed", ok: true });
    expect(requests[0]?.url).toBe("https://account.r2.cloudflarestorage.com/demo-bucket");
    expect(requests[0]?.init?.method).toBe("HEAD");
    expect(headers.authorization).toContain("AWS4-HMAC-SHA256 Credential=access-key-id/");
    expect(headers.authorization).toContain("/auto/s3/aws4_request");
    expect(headers.authorization).toContain("SignedHeaders=host;x-amz-content-sha256;x-amz-date");
    expect(headers.authorization).not.toContain("secret-access-key");
    expect(headers.authorization).not.toContain("baipiao-test");
    expect(headers["x-amz-content-sha256"]).toBe("UNSIGNED-PAYLOAD");
    expect(headers["x-amz-date"]).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it("runs openai-compatible tests through an injected adapter", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");

    const result = await runConnectionTest({
      service: groq!,
      env: { GROQ_API_KEY: "gsk_abcdefghijklmnopqrstuvwxyz1234" },
      adapters: {
        openaiCompatibleChat: (spec, env) => Promise.resolve({
          status: "passed",
          ok: true,
          message: `${spec.baseUrl}:${env[spec.envKey]?.slice(0, 4) ?? ""}`,
          latencyMs: 12
        })
      }
    });

    expect(result).toMatchObject({
      status: "passed",
      ok: true,
      latencyMs: 12
    });
    expect(result.message).toContain("https://api.groq.com/openai/v1:gsk_");
  });

  it("returns skipped for prompt-only services", async () => {
    const services = await loadServiceConfigs();
    const vercel = services.find((service) => service.id === "vercel");

    await expect(runConnectionTest({ service: vercel!, env: {} })).resolves.toMatchObject({
      status: "skipped",
      ok: true
    });
  });

  it("masks secret values in failed test messages", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");

    const result = await runConnectionTest({
      service: groq!,
      env: { GROQ_API_KEY: "gsk_abcdefghijklmnopqrstuvwxyz1234" },
      adapters: {
        openaiCompatibleChat: () => Promise.resolve({
          status: "failed",
          ok: false,
          message: "Rejected key gsk_abcdefghijklmnopqrstuvwxyz1234"
        })
      }
    });

    expect(result.message).toContain("gsk_**************************1234");
    expect(result.message).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });
});
