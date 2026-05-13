import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { initializeProject } from "../project/init.js";
import { updateProjectServiceState } from "./index.js";

let tmpPaths: string[] = [];

describe("project service status", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("upserts service state without dropping existing services", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-status-"));
    tmpPaths.push(cwd);
    await initializeProject({ cwd, name: "Status App" });

    await updateProjectServiceState(cwd, {
      serviceId: "groq",
      state: "prompt_generated",
      envKeys: [],
      configKeys: [],
      lastPromptGeneratedAt: "2026-05-12T00:00:00.000Z"
    });
    await updateProjectServiceState(cwd, {
      serviceId: "supabase",
      state: "configured",
      envKeys: ["SUPABASE_URL"],
      configKeys: ["SUPABASE_URL"]
    });
    await updateProjectServiceState(cwd, {
      serviceId: "groq",
      state: "tested",
      envKeys: ["GROQ_API_KEY"],
      configKeys: ["GROQ_API_KEY"],
      lastTestAt: "2026-05-12T00:01:00.000Z"
    });

    const parsed = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string; envKeys: string[]; configKeys: string[] }>;
    };

    expect(parsed.services).toHaveLength(2);
    expect(parsed.services.find((service) => service.serviceId === "groq")).toMatchObject({
      serviceId: "groq",
      state: "tested",
      envKeys: ["GROQ_API_KEY"],
      configKeys: ["GROQ_API_KEY"]
    });
    expect(parsed.services.find((service) => service.serviceId === "supabase")).toMatchObject({
      serviceId: "supabase",
      state: "configured"
    });
  });
});
