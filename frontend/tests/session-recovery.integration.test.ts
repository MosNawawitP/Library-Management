import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { encode } from "next-auth/jwt";

const testUrl = process.env.LIBRARY_SESSION_TEST_URL;

test(
  "Next.js clears an old session on Login and rejects it on protected pages",
  { skip: !testUrl },
  async () => {
    assert.equal(testUrl, "http://localhost:3010");
    const name = "authjs.session-token";
    const token = await encode({
      token: { name: "Old session" },
      secret: randomBytes(32).toString("base64"),
      salt: name,
    });
    const headers = { cookie: `${name}=${token}` };
    const login = await fetch(`${testUrl}/login`, {
      headers,
      redirect: "manual",
    });
    assert.equal(login.status, 200);
    assert.ok(
      login.headers
        .getSetCookie()
        .some(
          (cookie) =>
            cookie.startsWith(`${name}=`) && cookie.includes("Max-Age=0"),
        ),
    );
    const html = await login.text();
    assert.ok(!html.includes("JWTSessionError"));
    assert.ok(!html.includes("no matching decryption secret"));
    for (const path of ["/dashboard", "/books", "/categories"]) {
      const response: Response = await fetch(`${testUrl}${path}`, {
        headers,
        redirect: "manual",
      });
      assert.equal(response.status, 307);
      assert.equal(
        new URL(response.headers.get("location")!, testUrl).pathname,
        "/login",
      );
      assert.ok(
        response.headers
          .getSetCookie()
          .some(
            (cookie) =>
              cookie.startsWith(`${name}=`) && cookie.includes("Max-Age=0"),
          ),
      );
      await response.text();
    }
    const session = await fetch(`${testUrl}/api/auth/session`, { headers });
    assert.equal(session.status, 200);
    assert.equal(await session.json(), null);
    assert.ok(
      session.headers
        .getSetCookie()
        .some(
          (cookie) =>
            cookie.startsWith(`${name}=`) && cookie.includes("Max-Age=0"),
        ),
    );
  },
);
