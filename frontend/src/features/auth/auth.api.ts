export type AuthErrorCode =
  | "invalid_credentials"
  | "locked"
  | "invalid_request"
  | "unavailable"
  | "unexpected_response";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export class AuthApiError extends Error {
  readonly code: AuthErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(
    code: AuthErrorCode,
    retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "AuthApiError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function authenticate(
  credentials: LoginCredentials,
): Promise<AuthenticatedUser> {
  const username = credentials.username.trim();
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password: credentials.password }),
      cache: "no-store",
    });
  } catch {
    throw new AuthApiError("unavailable");
  }

  const payload = await readJson(response);

  if (!response.ok) {
    throw createResponseError(response.status, payload);
  }

  const loginData = readLoginData(payload);
  if (!loginData) {
    throw new AuthApiError("unexpected_response");
  }

  return {
    id: username,
    name: username,
    accessToken: loginData.token,
    accessTokenExpiresAt: loginData.expiresAtUtc,
  };
}

function getApiBaseUrl(): string {
  const configuredUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!configuredUrl) {
    throw new AuthApiError("unavailable");
  }

  return configuredUrl.replace(/\/$/, "");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (!response.ok) {
      return null;
    }

    throw new AuthApiError("unexpected_response");
  }
}

function createResponseError(status: number, payload: unknown): AuthApiError {
  if (status === 401) {
    return new AuthApiError("invalid_credentials");
  }

  if (status === 423) {
    return new AuthApiError("locked", readRetryAfterSeconds(payload));
  }

  if (status === 400) {
    return new AuthApiError("invalid_request");
  }

  return new AuthApiError("unavailable");
}

function readLoginData(
  payload: unknown,
): { token: string; expiresAtUtc: string } | null {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    return null;
  }

  const { token, tokenType, expiresAtUtc } = payload.data;
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    typeof tokenType !== "string" ||
    tokenType.toLowerCase() !== "bearer" ||
    typeof expiresAtUtc !== "string" ||
    Number.isNaN(Date.parse(expiresAtUtc))
  ) {
    return null;
  }

  return { token, expiresAtUtc };
}

function readRetryAfterSeconds(payload: unknown): number | undefined {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return undefined;
  }

  const retryAfterSeconds = payload.data.retryAfterSeconds;
  return typeof retryAfterSeconds === "number" && retryAfterSeconds > 0
    ? retryAfterSeconds
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
