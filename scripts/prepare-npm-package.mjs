import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = process.cwd();
const packageName = process.env.npm_package_name;

await cp(resolve(repoRoot, "README.md"), resolve(packageRoot, "README.md"));
await cp(resolve(repoRoot, "LICENSE"), resolve(packageRoot, "LICENSE"));

if (packageName === "baipiao-core") {
  const target = resolve(packageRoot, "registry");
  await rm(target, { recursive: true, force: true });
  await cp(resolve(repoRoot, "registry", "configs"), resolve(target, "configs"), { recursive: true });
  await cp(resolve(repoRoot, "registry", "catalog"), resolve(target, "catalog"), { recursive: true });
  await cp(
    resolve(repoRoot, "registry", "sources", "free-for-dev", "source.json"),
    resolve(target, "sources", "free-for-dev", "source.json")
  );
  await cp(
    resolve(repoRoot, "registry", "sources", "free-for-dev", "normalized.json"),
    resolve(target, "sources", "free-for-dev", "normalized.json")
  );
}
