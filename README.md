# BlindSweeper

> *"The board is black. You cannot see what you are looking for. That is the game."*

A minefield game played entirely by feel. No colors. No numbers. Just your finger, the dark, and a sense of impending doom.

---

## What Is This?

The board is pure black. You drag one finger across it and feel proximity to mines through haptic vibration. Tap to mark what you think is a mine. Drag into an unmarked one and you lose. Mark every mine and advance to a harder level.

There is no visual board state during play. No revealed numbers, no color gradients, no hint tiles. The only feedback is the intensity of the vibration under your fingertip. You build a mental map, or you explode.

---

## How to Play

- **Drag** across the board: your phone vibrates harder as you approach a mine
- **Tap** a cell to mark it as a mine (or unmark it)
- Mark every mine without dragging into one to clear the level
- Each level adds more mines on the same grid

A run persists across sessions. Your best level and explosion count are tracked. Nothing resets unless you choose to reset.

---

## Features

- Haptic proximity feedback: vibration intensity scales with distance to nearest mine
- Visual feedback mode (optional): a 5-bar proximity meter and board color shifts for environments without vibration
- Debug reveal mode: shows mine positions, for testing or frustration relief
- Single persistent run per device, stored in localStorage
- Gesture hint on first play: fades after 5 seconds or first touch
- Failure ceremony: your last level, large, with the explosion image at low opacity
- Confirm gate before abandoning an active run
- PWA-ready: installable, works offline

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 + TypeScript |
| Persistence | localStorage (versioned, schema-validated) |
| Game logic | Pure TypeScript, no dependencies |
| Images | Static PNG assets, generated once via OpenAI (committed, never generated at runtime) |
| Fonts | Inter (system fallback stack) |

---

## Getting Started

### Prerequisites

- Node.js 24

### Install and run

```bash
npm run install:all
npm run dev
```

Frontend runs at `http://localhost:5173`.

No environment variables needed for normal development.

### Verify

```bash
npm run lint
npm test
npm run tsc
```

---

## Project Structure

```
blindsweeper/
├── frontend/
│   ├── public/
│   │   └── images/
│   │       ├── app-icon.png          # App icon / home screen logo
│   │       └── game/                 # bomb.png, mark.png, explosion.png
│   └── src/
│       ├── main.tsx                  # React entrypoint
│       ├── App.tsx                   # Full app: routing, game screens, board
│       ├── game/
│       │   ├── types.ts              # Canonical game and persistence types
│       │   └── gameEngine.ts         # Pure minefield and proximity functions
│       ├── lib/
│       │   ├── gameState.ts          # State transitions (start run, mark, fail, reset)
│       │   ├── localStorageState.ts  # Versioned localStorage load/save/migrate
│       │   ├── gameState.test.ts     # Unit tests
│       │   ├── localStorageState.test.ts
│       │   └── devLog.ts             # Dev-only logging (silent in production)
│       └── types/
│           └── index.ts              # Re-export of game types for frontend imports
│
├── scripts/
│   └── generateStaticAssets.mjs     # One-time dev script: generates game images via OpenAI
│
├── PRODUCT.md                        # Brand personality, users, design principles
├── DESIGN.md                         # Color system, typography, component tokens
└── .env.example                      # Environment variable reference
```

---

## Static Assets

Game images (`bomb.png`, `mark.png`, `explosion.png`) are generated once by a developer and committed. The browser app never calls OpenAI.

To regenerate:

```bash
# Copy .env.example to .env and add your key
OPENAI_API_KEY=sk-...

npm run generate-static-assets
```

The script skips files that already exist. Delete the ones you want to regenerate first.

---

## Deployment

The app is deployed as static files to S3 + CloudFront at **https://blindsweeper.erikzaadi.com**.

Deployments are triggered by pushing a version tag. Use the bump-version script:

```bash
npm run bump-version       # creates annotated tag vX.Y.Z
git push origin vX.Y.Z    # triggers the deploy workflow
```

The GitHub Actions deploy workflow builds the frontend, syncs to S3 with split cache headers (long TTL for hashed assets, no-cache for `index.html`), and invalidates CloudFront.

Infrastructure is managed with Terraform under `terraform/`. See `terraform/terraform.tfvars.example` for the required variables.

---

## Mobile QA Checklist

Before tagging a release, verify on a real mobile device:

- Dragging over the black board produces increasing vibration near mines
- On a device without vibration, the proximity meter and color fallback activate
- Stopping and tapping a mine marks it
- Dragging into an unmarked mine explodes and shows the failure screen
- Tapping a non-mine marks it with a proximity hint
- Tapping a marked mine toggles it back to unmarked
- Completing a level creates a harder next level
- Local profile progress survives page reload
- On a supported browser, the app can be added to the home screen and launches without browser chrome

---

## Deferred (v1 non-goals)

- Cross-device sync - profiles are local browser save slots only
- Authentication
- Anti-cheat - mine coordinates are held client-side
- Richer telemetry / analytics
- Playwright E2E tests - deferred until core flow stabilises
- Service worker / offline mode - installability metadata is present but no SW registered

---

## Design

The visual design follows a single north star: **The Dead of Night**.

The board is void black (#000000). Page surfaces are near-black (#050505). The only accent color is Cleared Signal (#34d399), reserved exclusively for confirmed-safe states: the primary action, active level indicator, marked cells. Its scarcity is its meaning.

Full design system: [DESIGN.md](./DESIGN.md). Product principles: [PRODUCT.md](./PRODUCT.md).

---

*Built in the dark, by feel.*

---

## License

This project is licensed under the AGPL-3.0 [License](./LICENSE).

If you run a modified version of this software as a service, you must make the source code of your modifications available to users.
