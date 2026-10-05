import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  AuthApiError,
  authenticate,
} from "../src/features/auth/auth.api.ts";

const originalApiBaseUrl = process.env.API_BASE_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env.API_BASE_URL = originalApiBaseUrl;
  globalThis.fetch = originalFetch;
});

test("authenticate returns the backend token for valid credentials", async () => {
  process.env.API_BASE_URL = "http://localhost:5088/";
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "http://localhost:5088/api/auth/login");
    assert.equal(init?.method, "POST");
    assert.equal(
      init?.body,
      JSON.stringify({ username: "admin", password: "Library@123" }),
    );

    return Response.json({
      success: true,
      message: "Operation completed successfully",
      data: {
        token: "backend.jwt.token",
        tokenType: "Bearer",
        expiresAtUtc: "2026-10-05T12:00:00+00:00",
      },
      meta: null,
    });
  };

  const result = await authenticate({
    username: " admin ",
    password: "Library@123",
  });

  assert.deepEqual(result, {
    id: "admin",
    name: "admin",
    accessToken: "backend.jwt.token",
    accessTokenExpiresAt: "2026-10-05T12:00:00+00:00",
  });
});

test("authenticate identifies invalid username or password", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        message: "Invalid username or password.",
        data: { message: "Invalid username or password." },
        meta: null,
      },
      { status: 401 },
    );

  await assert.rejects(
    authenticate({ username: "admin", password: "wrong" }),
    (error: unknown) =>
      error instanceof AuthApiError && error.code === "invalid_credentials",
  );
});

test("authenticate preserves the retry delay when login is locked", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        message: "Login is temporarily locked.",
        data: { retryAfterSeconds: 420 },
        meta: null,
      },
      { status: 423 },
    );

  await assert.rejects(
    authenticate({ username: "admin", password: "wrong" }),
    (error: unknown) =>
      error instanceof AuthApiError &&
      error.code === "locked" &&
      error.retryAfterSeconds === 420,
  );
});

test("authenticate rejects malformed successful responses", async () => {
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      message: "Operation completed successfully",
      data: { token: "missing-fields" },
      meta: null,
    });

  await assert.rejects(
    authenticate({ username: "admin", password: "Library@123" }),
    (error: unknown) =>
      error instanceof AuthApiError && error.code === "unexpected_response",
  );
});

test("authenticate reports a backend connection failure", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  await assert.rejects(
    authenticate({ username: "admin", password: "Library@123" }),
    (error: unknown) =>
      error instanceof AuthApiError && error.code === "unavailable",
  );
});
