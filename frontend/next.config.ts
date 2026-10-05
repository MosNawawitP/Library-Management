import type { NextConfig } from "next";

for (const name of ["API_BASE_URL", "NEXT_PUBLIC_API_BASE_URL"]) {
  const value = process.env[name];
  if (value !== undefined) validateApiBaseUrl(value, name);
}

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;

export function validateApiBaseUrl(value: string, name: string): void {
  // URL() accepts an empty trailing port and silently defaults to port 80/443.
  if (/^https?:\/\/[^/?#]*:(?:[/?#]|$)/i.test(value)) {
    throw new Error(
      `${name} has an incomplete port. Supply the API port after the colon, for example 5088.`,
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute HTTP or HTTPS API URL.`);
  }
  if (
    value !== value.trim() ||
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must be an HTTP or HTTPS API URL without whitespace, credentials, query parameters or fragments.`,
    );
  }
}
