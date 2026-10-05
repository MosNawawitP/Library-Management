import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const environments = ["development", "uat", "production"] as const;
const requiredVariables = [
  "API_BASE_URL",
  "NEXT_PUBLIC_API_BASE_URL",
  "AUTH_SECRET",
  "AUTH_TRUST_HOST",
  "AUTH_URL",
] as const;

test("each deployment environment has a complete example file", () => {
  for (const environment of environments) {
    const variables = readEnvironmentExample(environment);

    assert.deepEqual(
      Object.keys(variables).sort(),
      [...requiredVariables].sort(),
      `.env.${environment}.example must contain exactly the supported variables`,
    );
  }
});

test("each environment example uses a distinct Auth.js secret placeholder", () => {
  const secrets = environments.map(
    (environment) => readEnvironmentExample(environment).AUTH_SECRET,
  );

  assert.equal(new Set(secrets).size, environments.length);
});

test("Docker uses one environment file for build and runtime configuration", () => {
  const variables = readEnvironmentFile(".env.example");
  const compose = readFileSync("../docker-compose.yml", "utf8");

  assert.deepEqual(
    Object.keys(variables).sort(),
    [...requiredVariables].sort(),
  );
  assert.equal(variables.API_BASE_URL, "http://backend:8080");
  assert.equal(variables.NEXT_PUBLIC_API_BASE_URL, "http://localhost:5088");
  assert.equal(variables.AUTH_URL, "http://localhost:3000");
  assert.equal(variables.AUTH_TRUST_HOST, "true");
  assert.match(compose, /env_file:\s*\r?\n\s+- \.\/frontend\/\.env/);
  assert.match(
    compose,
    /NEXT_PUBLIC_API_BASE_URL:\s*\$\{NEXT_PUBLIC_API_BASE_URL\}/,
  );
});

function readEnvironmentExample(environment: (typeof environments)[number]) {
  return readEnvironmentFile(`.env.${environment}.example`);
}

function readEnvironmentFile(fileName: string) {
  const content = readFileSync(fileName, "utf8");

  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=", 2)),
  );
}
