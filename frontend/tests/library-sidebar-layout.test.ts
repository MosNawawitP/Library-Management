import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const libraryLayoutSource = readFileSync(
  new URL("../src/app/(library)/layout.tsx", import.meta.url),
  "utf8",
);
const librarySidebarSource = readFileSync(
  new URL("../src/components/layout/library-sidebar.tsx", import.meta.url),
  "utf8",
);

test("desktop sidebar stays below the header while page content scrolls", () => {
  assert.match(librarySidebarSource, /md:fixed/);
  assert.match(librarySidebarSource, /md:top-20/);
  assert.match(librarySidebarSource, /md:bottom-0/);
  assert.match(librarySidebarSource, /md:overflow-y-auto/);
  assert.match(libraryLayoutSource, /md:ml-\[17rem\]/);
});
