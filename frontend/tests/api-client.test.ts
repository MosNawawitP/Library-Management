import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  SessionExpiredError,
  authenticatedFetch,
} from "../src/lib/api-client.ts";

const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  globalThis.fetch = originalFetch;
});

test("authenticatedFetch sends the bearer token to the configured Back-end", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5088/";
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "http://localhost:5088/api/books");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer backend.jwt.token");
    assert.equal(headers.get("Accept"), "application/json");
    return Response.json({ success: true });
  };

  const response = await authenticatedFetch("/api/books", {
    accessToken: "backend.jwt.token",
  });

  assert.equal(response.status, 200);
});

test("authenticatedFetch clears the Auth.js session when Back-end returns 401", async () => {
  let unauthorizedCalls = 0;
  globalThis.fetch = async () => new Response(null, { status: 401 });

  await assert.rejects(
    authenticatedFetch("/api/auth/validate-token", {
      accessToken: "expired.jwt.token",
      onUnauthorized: async () => {
        unauthorizedCalls += 1;
      },
    }),
    SessionExpiredError,
  );

  assert.equal(unauthorizedCalls, 1);
});

test("authenticatedFetch leaves the session intact for non-401 errors", async () => {
  let unauthorizedCalls = 0;
  globalThis.fetch = async () => new Response(null, { status: 500 });

  const response = await authenticatedFetch("/api/books", {
    accessToken: "backend.jwt.token",
    onUnauthorized: async () => {
      unauthorizedCalls += 1;
    },
  });

  assert.equal(response.status, 500);
  assert.equal(unauthorizedCalls, 0);
});
