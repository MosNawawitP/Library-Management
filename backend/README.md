# Library Management Back-end

ASP.NET Core Minimal API targeting .NET 10.

The repository-local SDK is installed in `.dotnet` and is intentionally ignored by Git. From this directory, run:

```powershell
$env:DOTNET_CLI_HOME = "$PWD\.dotnet-home"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = "1"
$env:NUGET_PACKAGES = "$PWD\.nuget\packages"
& ".\.dotnet\dotnet.exe" restore LibraryManagement.slnx --configfile NuGet.Config
& ".\.dotnet\dotnet.exe" run --project src/LibraryManagement.Api
```

The API loads configuration from `backend/.env` during local development. Create it
from `backend/.env.example` and replace `Jwt__SigningKey` with a
cryptographically random value of at least 32 bytes. The real `.env` file is ignored
by Git. Existing process/container environment variables take precedence over values
from the file.

OpenAPI is available at `/openapi/v1.json` in the Development environment. Health endpoints are available at `/health/live` and `/health/ready`.

The complete Front-end handoff contract, including headers, payloads, responses,
validation, and status codes, is documented in `../docs/api-contract.md`. An importable
Postman collection is available at `LibraryManagement.Api.postman_collection.json`.

The readiness endpoint verifies that `library.json` is valid and that its data directory
is writable. The live endpoint checks only that the process is running.

## Mock authentication

`POST /api/auth/login` accepts `username` and `password`. The mock seed account is
`admin` / `Library@123`; only its salted PBKDF2 hash is stored in
`src/LibraryManagement.Api/Seed/user.seed.json`. The empty session table template is
stored in `src/LibraryManagement.Api/Seed/userSession.seed.json`. At first use, the API
creates the ignored runtime files `data/user.json` and `data/userSession.json`. Every
successful login appends a history record to the latter file, with `userId` referencing
a user in `user.json`. Existing embedded `userSessions` data is migrated automatically.

Set `Jwt__SigningKey` in `backend/.env` for local development or inject the same
environment variable from the deployment secret store. Never commit the real signing
key. Tokens expire after eight hours. Ten consecutive bad passwords lock the account
for ten minutes.

`GET /api/auth/validate-token` is a protected endpoint for checking the current Bearer
token. Protected endpoints must call `RequireAuthorization()`. The JWT middleware
requires the Authorization header, validates signature, issuer, audience and expiry,
then verifies that the token's `userId` and `jti` still match an active record in
`data/userSession.json`. Endpoints marked `AllowAnonymous()` bypass this check.

## Books and categories

All `/api/books` and `/api/categories` requests require the same Bearer token used by
`/api/auth/validate-token`. Books support CRUD plus case-insensitive search, category
filtering, and pagination. Categories support CRUD, case-insensitive search, and
pagination. A bare `GET /api/categories` remains an unpaginated lookup for existing
Books consumers; adding any search or pagination query parameter enables the paginated
contract. Initial categories are loaded from `Seed/library.seed.json` only when
`data/library.json` does not yet exist.

The JSON snapshot includes an empty `loans` collection. Book availability and the
update/delete safeguards already read this collection, but adding loan records and loan
endpoints remains a pending Loans-module integration. Runtime data is kept in the
ignored `data/library.json` file and is not reset on restart.
