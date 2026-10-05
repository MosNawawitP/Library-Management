import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIBRARY_NAVIGATION_ITEMS,
  isLibraryNavigationItemActive,
} from "../src/components/layout/library-navigation.ts";

test("library navigation exposes only the routes supported by the current system", () => {
  assert.deepEqual(
    LIBRARY_NAVIGATION_ITEMS.map(({ href, label }) => ({ href, label })),
    [
      { href: "/dashboard", label: "แดชบอร์ด" },
      { href: "/books", label: "หนังสือ" },
      { href: "/categories", label: "หมวดหมู่" },
    ],
  );
});

test("library navigation keeps a section active on its detail pages", () => {
  assert.equal(isLibraryNavigationItemActive("/books", "/books"), true);
  assert.equal(isLibraryNavigationItemActive("/books/42", "/books"), true);
  assert.equal(isLibraryNavigationItemActive("/categories", "/books"), false);
});
