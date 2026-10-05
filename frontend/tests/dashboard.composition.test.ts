import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

const dashboardPagePath = "src/app/(library)/dashboard/page.tsx";

test("dashboard composes Books and Categories APIs without a dashboard endpoint", async () => {
  const pageSource = await readFile(dashboardPagePath, "utf8");
  const sourceFiles = await readdir("src", { recursive: true });
  const sources = await Promise.all(
    sourceFiles
      .filter((file) => /\.(?:ts|tsx)$/.test(file))
      .map((file) => readFile(`src/${file}`, "utf8")),
  );

  assert.match(pageSource, /getBooks/);
  assert.match(pageSource, /getCategories/);
  assert.doesNotMatch(sources.join("\n"), /\/api\/dashboard/);
});
