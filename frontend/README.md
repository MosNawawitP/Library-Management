# Library Management Front-end

Next.js App Router front-end for the Library Management System.

## Local development

The project uses one local environment file per deployment target:

| Target | Local file | Example file | Command |
| --- | --- | --- | --- |
| Docker Compose | `.env` | `.env.example` | `docker compose --env-file ./frontend/.env up -d --build` |
| Development | `.env.development` | `.env.development.example` | `npm run dev` or `npm run build:dev` |
| UAT | `.env.uat` | `.env.uat.example` | `npm run build:uat` |
| Production | `.env.production` | `.env.production.example` | `npm run build:prod` |

Local environment files are ignored by Git. Copy the matching example when
setting up a new machine, then replace its API origin and `AUTH_SECRET`. The
checked-in UAT and Production examples use reserved example domains and are not
deployable values.

Start the Development server:

```powershell
Copy-Item .env.development.example .env.development
# Replace the AUTH_SECRET placeholder with a strong random value.
npm install
npm run dev
```

The application is available at `http://localhost:3000` by default. Development
uses the Back-end at `http://localhost:5088`.

## Docker Compose

Docker Compose uses `frontend/.env` as the single source for both the Front-end
build argument and runtime environment. Create it from the checked-in example,
replace the `AUTH_SECRET` placeholder, and pass the same file to Compose:

```powershell
Copy-Item ./frontend/.env.example ./frontend/.env
# Replace the AUTH_SECRET placeholder with a strong random value.
docker compose --env-file ./frontend/.env up -d --build
```

Run the Compose command from the repository root. The `--env-file` option makes
`NEXT_PUBLIC_API_BASE_URL` available while Compose resolves build arguments;
the service-level `env_file` sends `API_BASE_URL`, `AUTH_URL`,
`AUTH_TRUST_HOST`, and `AUTH_SECRET` to the running container. Do not pass
`AUTH_SECRET` as a build argument.

Inside Docker, `API_BASE_URL` must use the internal service address
`http://backend:8080`. `NEXT_PUBLIC_API_BASE_URL` remains
`http://localhost:5088` because browser requests originate from the host.

API_BASE_URL is used on the server, while NEXT_PUBLIC_API_BASE_URL is used by
Books, Categories and session validation in the browser. Both must point to the
correct Back-end origin. For local development use http://localhost:5088 for both;
http://localhost: without a port targets the wrong origin even if Login works.
Next.js checks these values at startup and rejects incomplete or invalid URLs.
Restart the development server after changing them; rebuild production bundles
because NEXT_PUBLIC_API_BASE_URL is embedded at build time.

Build a specific environment:

```powershell
npm run build:dev
npm run build:uat
npm run build:prod
```

Before a UAT or Production build, create the corresponding ignored local file:

```powershell
Copy-Item .env.uat.example .env.uat
Copy-Item .env.production.example .env.production
```

Values prefixed with `NEXT_PUBLIC_` are public and embedded into the browser bundle
at build time. Back-end secrets such as `Jwt__SigningKey` must remain in the
Back-end environment and must not be copied into this project.

`API_BASE_URL` is used by the Auth.js server route to call the Back-end login API.
`AUTH_SECRET` encrypts the Auth.js session cookie and must be configured separately
for each deployed environment. Do not reuse the Back-end JWT signing key as the
Auth.js secret.

Keep AUTH_SECRET stable across restarts and use the same value across instances
of the same environment. Changing it makes existing session cookies unreadable;
users must sign in again. Do not generate a new secret on every application start.

The request proxy in src/proxy.ts removes invalid or expired Auth.js session
cookies before pages read them, including HTTPS and chunked cookies. It also
expires those cookies in the browser. Valid sessions and unrelated cookies are
preserved; page and Back-end authentication checks still apply. Missing secret
configuration is not suppressed by this recovery.

Authenticated Client Component API modules must use `authenticatedFetch` from
`src/lib/api-client.ts`. It attaches the Bearer token and clears the Auth.js
session automatically when the Back-end returns `401 Unauthorized`.

## Checks

```powershell
npx eslint .
npx tsc --noEmit
npm run build
```
