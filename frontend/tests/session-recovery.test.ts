import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server.js";
import { encode } from "next-auth/jwt";
import { proxy } from "../src/proxy.ts";

const originalSecret = process.env.AUTH_SECRET;
const originalLegacySecret = process.env.NEXTAUTH_SECRET;
const cookieName = "authjs.session-token";
const currentSecret = randomBytes(32).toString("base64");
beforeEach(() => {
  process.env.AUTH_SECRET = currentSecret;
});
afterEach(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
  if (originalLegacySecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalLegacySecret;
});

test("a valid session using the current secret is preserved", async () => {
  const token = await encode({
    token: { name: "Test user" },
    secret: currentSecret,
    salt: cookieName,
  });
  const request = new NextRequest("http://localhost:3000/books", {
    headers: { cookie: `${cookieName}=${token}` },
  });
  const response = await proxy(request);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(request.cookies.get(cookieName)?.value, token);
  assert.equal(response.headers.get("x-middleware-request-cookie"), null);
});

test("malformed and expired sessions are cleared", async () => {
  const expired = await encode({
    token: {},
    secret: currentSecret,
    salt: cookieName,
    maxAge: -60,
  });
  for (const token of ["broken-session", expired, ""]) {
    const request = new NextRequest("http://localhost:3000/login", {
      headers: { cookie: `${cookieName}=${token}` },
    });
    const response = await proxy(request);
    assert.equal(request.cookies.has(cookieName), false);
    assert.equal(response.cookies.get(cookieName)?.maxAge, 0);
  }
});

test("secure chunked sessions are reconstructed and only invalid chunks are expired", async () => {
  const secureName = "__Secure-authjs.session-token";
  for (const secret of [currentSecret, randomBytes(32).toString("base64")]) {
    const token = await encode({
      token: { name: "Test user" },
      secret,
      salt: secureName,
    });
    const midpoint = Math.floor(token.length / 2);
    const request = new NextRequest("https://library.example/login", {
      headers: {
        cookie: `${secureName}.1=${token.slice(midpoint)}; ${secureName}.0=${token.slice(0, midpoint)}; unrelated=keep`,
      },
    });
    const response = await proxy(request);
    assert.equal(request.cookies.get("unrelated")?.value, "keep");
    if (secret === currentSecret) {
      assert.equal(response.headers.get("set-cookie"), null);
      assert.equal(request.cookies.has(`${secureName}.0`), true);
    } else {
      for (const suffix of [".0", ".1"]) {
        assert.equal(request.cookies.has(`${secureName}${suffix}`), false);
        assert.equal(response.cookies.get(`${secureName}${suffix}`)?.maxAge, 0);
        assert.equal(
          response.cookies.get(`${secureName}${suffix}`)?.secure,
          true,
        );
      }
    }
  }
});

test("requests without a session pass through and missing secrets are not disguised", async () => {
  const anonymous = await proxy(new NextRequest("http://localhost:3000/login"));
  assert.equal(anonymous.headers.get("set-cookie"), null);
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
  const request = new NextRequest("http://localhost:3000/login", {
    headers: { cookie: `${cookieName}=broken-session` },
  });
  const response = await proxy(request);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(request.cookies.has(cookieName), true);
});

test("a session encrypted with an old secret is removed before Server Components read it", async () => {
  const token = await encode({
    token: { name: "Test user" },
    secret: randomBytes(32).toString("base64"),
    salt: cookieName,
  });
  const request = new NextRequest("http://localhost:3000/login", {
    headers: {
      cookie: `${cookieName}=${token}; preference=compact; authjs.csrf-token=csrf`,
    },
  });
  const response = await proxy(request);
  const forwardedCookies =
    response.headers.get("x-middleware-request-cookie") ?? "";
  assert.ok(!forwardedCookies.includes(`${cookieName}=`));
  assert.ok(forwardedCookies.includes("preference=compact"));
  assert.ok(forwardedCookies.includes("authjs.csrf-token=csrf"));
  assert.equal(response.cookies.get(cookieName)?.maxAge, 0);
});
