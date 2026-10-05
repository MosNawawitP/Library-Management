import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  AuthApiError,
  authenticate,
} from "@/features/auth/auth.api";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class LoginLockedError extends CredentialsSignin {
  code = "locked";
}

class InvalidLoginRequestError extends CredentialsSignin {
  code = "invalid_request";
}

class AuthenticationUnavailableError extends CredentialsSignin {
  code = "service_unavailable";
}

export const { handlers, auth } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials.username;
        const password = credentials.password;

        if (typeof username !== "string" || typeof password !== "string") {
          throw new InvalidLoginRequestError();
        }

        try {
          return await authenticate({ username, password });
        } catch (error) {
          throw mapAuthenticationError(error);
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.accessTokenExpiresAt = user.accessTokenExpiresAt;
      }

      if (hasExpired(token.accessTokenExpiresAt)) {
        return null;
      }

      return token;
    },
    session({ session, token }) {
      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }

      if (typeof token.accessTokenExpiresAt === "string") {
        session.accessTokenExpiresAt = token.accessTokenExpiresAt;
      }

      return session;
    },
  },
});

function mapAuthenticationError(error: unknown): CredentialsSignin {
  if (!(error instanceof AuthApiError)) {
    return new AuthenticationUnavailableError();
  }

  switch (error.code) {
    case "invalid_credentials":
      return new InvalidCredentialsError();
    case "locked":
      return new LoginLockedError();
    case "invalid_request":
      return new InvalidLoginRequestError();
    default:
      return new AuthenticationUnavailableError();
  }
}

function hasExpired(expiresAt: unknown): boolean {
  return typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now();
}
