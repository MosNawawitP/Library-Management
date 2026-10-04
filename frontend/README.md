# Library Management Front-end

Next.js App Router front-end for the Library Management System.

## Local development

The project has separate local environment files for Development, UAT, and
Production. Replace the placeholder API origins in `.env.uat` and
`.env.production` before deploying.

Start the Development server:

```powershell
npm install
npm run dev
```

The application is available at `http://localhost:3000` by default. Development
uses the Back-end at `http://localhost:5088`.

Build a specific environment:

```powershell
npm run build:dev
npm run build:uat
npm run build:prod
```

Values prefixed with `NEXT_PUBLIC_` are public and embedded into the browser bundle
at build time. Back-end secrets such as `Jwt__SigningKey` must remain in the
Back-end environment and must not be copied into this project.

## Checks

```powershell
npx eslint .
npx tsc --noEmit
npm run build
```
