"use client";

import { signOut } from "next-auth/react";

type UnauthorizedHandler = () => Promise<void>;

export interface AuthenticatedRequestOptions extends RequestInit {
  accessToken: string;
  onUnauthorized?: UnauthorizedHandler;
}

export class SessionExpiredError extends Error {
  constructor() {
    super("The authenticated Back-end session has expired.");
    this.name = "SessionExpiredError";
  }
}

let pendingSessionClear: Promise<void> | undefined;

export async function authenticatedFetch(
  path: string,
  options: AuthenticatedRequestOptions,
): Promise<Response> {
  const {
    accessToken,
    onUnauthorized = clearAuthSession,
    headers: initialHeaders,
    ...requestOptions
  } = options;
  const headers = new Headers(initialHeaders);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(createApiUrl(path), {
    ...requestOptions,
    headers,
    cache: requestOptions.cache ?? "no-store",
  });

  if (response.status !== 401) {
    return response;
  }

  await onUnauthorized();
  throw new SessionExpiredError();
}

function createApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("API path must start with a forward slash.");
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required.");
  }

  return `${apiBaseUrl.replace(/\/$/, "")}${path}`;
}

function clearAuthSession(): Promise<void> {
  pendingSessionClear ??= signOut({ redirectTo: "/login" });
  return pendingSessionClear;
}
