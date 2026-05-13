import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = process.cwd();
const packageName = process.env.npm_package_name;

await Promise.all([
  rm(resolve(packageRoot, "README.md"), { force: true }),
  rm(resolve(packageRoot, "LICENSE"), { force: true }),
  packageName === "baipiao-core"
    ? rm(resolve(packageRoot, "registry"), { force: true, recursive: true })
    : Promise.resolve()
]);
