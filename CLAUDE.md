# CLAUDE.md

BlindSweeper web app. Stack: React 19 + Vite + Tailwind frontend, Node/Express backend, SQLite persistence, shared TypeScript game core.

## Dev setup

```bash
npm run install:all   # install root, shared, backend, and frontend
npm run dev           # backend :3001 + frontend :5173
```

The repo does not use npm workspaces. The shared package is linked from backend/frontend with `file:../packages/shared`, and `install:all` installs each package explicitly.

All runtime env vars live in the root `.env`. See `.env.example`.

## Before committing

Do not run token-heavy verification commands unless explicitly asked. This includes `npm test`, `npm run test:*`, `npm run build`, `npm run lint`, `npm run lint:*`, `npx tsc`, and package-specific variants. Ask the user to run the relevant command manually instead.

Manual verification checklist from repo root:

```bash
npm run lint
npm test
npm run tsc
```

Targeted variants:

| Script | What it checks |
|---|---|
| `npm run lint:shared` | ESLint on `packages/shared/src` |
| `npm run lint:backend` | ESLint on `backend/src` |
| `npm run lint:frontend` | ESLint on `frontend/src` |
| `npm run tsc:shared` | TypeScript check on `packages/shared` |
| `npm run tsc:backend` | TypeScript check on `backend` |
| `npm run tsc:frontend` | TypeScript check on `frontend` |
| `npm run test:shared` | Shared unit tests |
| `npm run test:backend` | Backend unit tests |
| `npm run test:frontend` | Frontend unit tests |

Both `lint` and `tsc` follow package order: shared -> backend -> frontend. After installing new deps in `packages/shared`, run `npm run install:all` from the root.

## Project layout

```text
packages/shared/src/
  types.ts       # Canonical API/game types shared by backend and frontend
  gameEngine.ts  # Pure minefield/proximity/rule functions shared by both apps

backend/src/
  index.ts       # Express app entrypoint
  config/env.ts  # Env var parsing
  lib/devLog.ts  # Development-only logging helper
  types.ts       # Re-export shared types for backend imports

frontend/src/
  main.tsx       # React entrypoint
  App.tsx        # App shell
  lib/api.ts     # API URL/fetch helpers
  lib/devLog.ts  # Development-only logging helper
  types/index.ts # Re-export shared types for frontend imports

terraform/       # AWS infrastructure
```

## Coding conventions

- No em dashes - use a hyphen or colon.
- All `if` statements must have braces.
- TypeScript strict mode is on in shared, backend, and frontend.
- Types crossing the API boundary belong in `packages/shared/src/types.ts`.
- Pure game rules and proximity math belong in `packages/shared/src/gameEngine.ts`.
- Backend services orchestrate persistence and authoritative state transitions by calling shared engine functions.
- Frontend live proximity feedback imports shared proximity functions and does not call the backend on every pointer move.
- Use `devLog` for debug/trace logs that should be silent in production.
- Use `console.log` only for operational events useful in production.
- Use `console.warn`/`console.error` for unexpected failures.

## DB migrations

The backend state service should run additive SQLite migrations on startup. Add columns or tables without dropping data. Do not drop columns or change column types in normal migrations.

## Terraform

Infrastructure lives in `terraform/`. `terraform/terraform.tfvars` is gitignored and must not be committed. Production uses CloudFront/S3 for the frontend and Lightsail with an attached disk for the backend SQLite database.
