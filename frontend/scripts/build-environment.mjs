import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

const environment = process.argv[2];
const supportedEnvironments = new Set(["development", "uat", "production"]);

if (!environment || !supportedEnvironments.has(environment)) {
  throw new Error(
    `Expected one of: ${Array.from(supportedEnvironments).join(", ")}.`,
  );
}

loadEnvFile(resolve(`.env.${environment}`));

const nextCli = resolve("node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextCli, "build"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
