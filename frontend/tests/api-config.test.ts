import assert from "node:assert/strict";
import { test } from "node:test";
import { validateApiBaseUrl } from "../next.config.ts";

test("API configuration rejects the incomplete localhost port seen in the browser failure", () => {
  assert.throws(
    () => validateApiBaseUrl("http://localhost:", "NEXT_PUBLIC_API_BASE_URL"),
    /NEXT_PUBLIC_API_BASE_URL.*port/i,
  );
});

test("API configuration accepts explicit ports and normal HTTP or HTTPS origins", () => {
  for (const url of [
    "http://localhost:5088",
    "https://api.example.com",
    "http://api:8080/library/",
  ]) {
    assert.doesNotThrow(() => validateApiBaseUrl(url, "API_BASE_URL"));
  }
});

test("API configuration rejects invalid URLs, credentials and query strings", () => {
  for (const url of [
    "",
    "localhost:5088",
    "ftp://api.example.com",
    "http://user:password@localhost:5088",
    "http://localhost:5088?key=value",
    "http://localhost:5088#fragment",
    " http://localhost:5088 ",
  ]) {
    assert.throws(
      () => validateApiBaseUrl(url, "API_BASE_URL"),
      /API_BASE_URL/,
    );
  }
});
