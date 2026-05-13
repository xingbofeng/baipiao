import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { BaipiaoError } from "../errors/index.js";
import { ProjectConfigSchema, type ProjectConfig } from "../schemas/index.js";
import { slugify } from "../registry/sources/normalizer.js";

export type InitializeProjectOptions = {
  cwd: string;
  name?: string;
  type?: "ai_saas" | "rag" | "blog" | "agent_tool" | "mobile_app" | "custom";
};

export type InitializeProjectResult = {
  createdFiles: string[];
  skippedFiles: string[];
};

export async function initializeProject(options: InitializeProjectOptions): Promise<InitializeProjectResult> {
  const name = options.name?.trim() || basename(options.cwd);
  const now = new Date().toISOString();
  const createdFiles: string[] = [];
  const skippedFiles: string[] = [];

  await mkdir(join(options.cwd, ".baipiao", "outputs"), { recursive: true });

  const projectConfig = ProjectConfigSchema.parse({
    id: randomUUID(),
    name,
    slug: slugify(name),
    type: options.type ?? "custom",
    createdAt: now,
    updatedAt: now,
    envPath: ".env.local"
  });

  await writeIfMissing(
    join(options.cwd, ".baipiao", "project.json"),
    ".baipiao/project.json",
    `${JSON.stringify(projectConfig, null, 2)}\n`,
    createdFiles,
    skippedFiles
  );
  await writeIfMissing(
    join(options.cwd, ".baipiao", "services.json"),
    ".baipiao/services.json",
    `${JSON.stringify({ services: [] }, null, 2)}\n`,
    createdFiles,
    skippedFiles
  );
  await writeIfMissing(join(options.cwd, ".env.local"), ".env.local", "", createdFiles, skippedFiles);
  await writeIfMissing(join(options.cwd, ".env.example"), ".env.example", "", createdFiles, skippedFiles);

  return { createdFiles, skippedFiles };
}

export async function loadProjectConfig(cwd: string): Promise<ProjectConfig> {
  try {
    const raw = await readFile(join(cwd, ".baipiao", "project.json"), "utf8");
    return ProjectConfigSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new BaipiaoError(
        "PROJECT_NOT_INITIALIZED",
        "Project is not initialized. Run `baipiao init` first."
      );
    }
    throw error;
  }
}

async function writeIfMissing(
  path: string,
  displayPath: string,
  content: string,
  createdFiles: string[],
  skippedFiles: string[]
): Promise<void> {
  try {
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
    createdFiles.push(displayPath);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      skippedFiles.push(displayPath);
      return;
    }
    throw error;
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
