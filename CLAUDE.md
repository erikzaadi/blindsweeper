# CLAUDE.md

BlindSweeper web app. Stack: React 19 + Vite + Tailwind frontend, localStorage persistence, and a frontend-local TypeScript game core. The app is frontend-only for v1.

## Dev setup

```bash
npm run install:all   # install root and frontend
npm run dev           # frontend :5173
```

The repo does not use npm workspaces. `install:all` installs root and frontend packages explicitly.

Normal dev/build/test do not require env vars. `OPENAI_API_KEY` is only needed when explicitly running `npm run generate-static-assets`.

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
| `npm run lint:frontend` | ESLint on `frontend/src` |
| `npm run tsc:frontend` | TypeScript check on `frontend` |
| `npm run test:frontend` | Frontend unit tests |

Run `npm run install:all` from the root after changing frontend dependencies.

## Project layout

```text
frontend/src/
  main.tsx       # React entrypoint
  App.tsx        # App shell
  game/
    types.ts       # Canonical game and persistence types
    gameEngine.ts  # Pure minefield/proximity/rule functions
  lib/gameState.ts           # Local game-state operations
  lib/localStorageState.ts   # Versioned localStorage persistence
  lib/devLog.ts  # Development-only logging helper
  types/index.ts # Re-export game types for frontend imports

scripts/
  generateStaticAssets.mjs   # Dev-only OpenAI static asset generator
```

## Coding conventions

- No em dashes - use a hyphen or colon.
- All `if` statements must have braces.
- TypeScript strict mode is on in the frontend.
- Game and persistence types belong in `frontend/src/game/types.ts`.
- Pure game rules and proximity math belong in `frontend/src/game/gameEngine.ts`.
- Frontend state operations orchestrate persistence and authoritative local state transitions by calling game engine functions.
- Frontend live proximity feedback imports local game engine proximity functions and does not make network calls.
- Use `devLog` for debug/trace logs that should be silent in production.
- Use `console.warn`/`console.error` for unexpected failures.

## Local persistence

Store one versioned JSON document in localStorage. Treat stored data as untrusted: parse defensively, validate shape, and recover to an empty state if data is corrupt. Add explicit migrations when the schema changes.

## Static assets

Static image/icon assets are generated only when a developer explicitly runs:

```bash
npm run generate-static-assets
```

The script uses `OPENAI_API_KEY`, writes missing files under `frontend/public/`, and skips existing files. Generated assets are committed source assets. The browser app and production deployment must never call OpenAI.
