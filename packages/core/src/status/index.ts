import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ProjectServiceRecordSchema, type ServiceState } from "../schemas/index.js";

export type ProjectServiceStateUpdate = {
  serviceId: string;
  state: ServiceState;
  envKeys: string[];
  configKeys: string[];
  lastPromptGeneratedAt?: string;
  lastAgentOutputAt?: string;
  lastSecretSavedAt?: string;
  lastTestAt?: string;
  lastError?: string;
};

type ServicesFile = {
  services: ProjectServiceStateUpdate[];
};

export async function updateProjectServiceState(
  cwd: string,
  update: ProjectServiceStateUpdate
): Promise<ProjectServiceStateUpdate> {
  const path = join(cwd, ".baipiao", "services.json");
  const file = await readServicesFile(path);
  const parsedUpdate = ProjectServiceRecordSchema.parse(update) as ProjectServiceStateUpdate;
  const nextServices = file.services.filter((service) => service.serviceId !== update.serviceId);
  nextServices.push(parsedUpdate);
  nextServices.sort((left, right) => left.serviceId.localeCompare(right.serviceId));
  await writeFile(path, `${JSON.stringify({ services: nextServices }, null, 2)}\n`, "utf8");
  return parsedUpdate;
}

async function readServicesFile(path: string): Promise<ServicesFile> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as { services?: unknown[] };
  return {
    services: (parsed.services ?? []).map((service) => ProjectServiceRecordSchema.parse(service) as ProjectServiceStateUpdate)
  };
}
