import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    accessTokenExpiresAt?: string;
    user: DefaultSession["user"];
  }

  interface User {
    accessToken: string;
    accessTokenExpiresAt: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpiresAt?: string;
  }
}
