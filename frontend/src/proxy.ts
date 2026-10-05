import { NextResponse, type NextRequest } from "next/server.js";
import { getToken } from "next-auth/jwt";

// These are Auth.js's default HTTP/HTTPS session cookie names.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  // Missing configuration must still surface as MissingSecret, not a logout.
  if (!secret) return NextResponse.next();

  const invalidCookies: string[] = [];
  for (const cookieName of SESSION_COOKIES) {
    const chunks = request.cookies
      .getAll()
      .filter(
        ({ name }) =>
          name === cookieName ||
          (name.startsWith(`${cookieName}.`) &&
            /^\d+$/.test(name.slice(cookieName.length + 1))),
      );
    if (!chunks.length) continue;

    // Check only this cookie, never an Authorization header or another session.
    const token = await getToken({
      req: {
        headers: new Headers({
          cookie: chunks
            .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
            .join("; "),
        }),
      },
      secret,
      cookieName,
      salt: cookieName,
    });
    if (!token) invalidCookies.push(...chunks.map(({ name }) => name));
  }

  if (!invalidCookies.length) return NextResponse.next();

  // RSC auth() cannot write cookies. Remove them from this request as well as
  // the browser, so the current render cannot read the broken session again.
  for (const name of invalidCookies) request.cookies.delete(name);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("Cache-Control", "private, no-store");
  for (const name of invalidCookies) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Secure-"),
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/books/:path*",
    "/categories/:path*",
    "/api/auth/:path*",
  ],
};
