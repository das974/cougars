# Battersea Cougars — Session Team Manager

A web app for managing Friday training sessions. The coach selects which players are attending and the app automatically generates balanced teams using a linear-programming solver.

---

## Features

- **Session picker** — view upcoming and past sessions; defaults to the next scheduled session
- **Roster management** — toggle player attendance; changes are debounced and persisted to Airtable
- **LP team generation** — two-phase MILP solver (PuLP/CBC) balances teams by rating and size while concentrating Cougar-status players on one team
- **Drag-and-drop** — manually reassign players between teams after generation
- **Admin mode** — password-protected; reveals player ratings, the Generate button, and Airtable edit links on player cards

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Data fetching | SWR |
| Drag and drop | @dnd-kit |
| Backend | Next.js Route Handlers (server-side only) |
| Database | Airtable (Players, Sessions, Teams tables) |
| Solver | Python 3, PuLP/CBC — called via `child_process.execSync` |

---

## Development

### Prerequisites

- Node.js 20+ (or use the dev container — see `.devcontainer/`)
- Python 3 with PuLP: `pip install -r requirements.txt`
- An Airtable API key with access to base `appYLV6Emy6bpluRY`

### Environment variables

Create `.env.local` in this directory:

```
AIRTABLE_API=your_airtable_personal_access_token
ADMIN_PASSWORD=your_admin_password
```

### Running locally

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

### Other scripts

```bash
npm run build      # production build
npm run start      # start the production build
npm run test       # run solver unit tests (vitest)
npm run clean      # delete .next build cache
```

---

## Project structure

```
team-manager/
├── app/
│   ├── page.tsx                  # Main UI — single 'use client' component
│   ├── layout.tsx                # Root layout (Geist font, metadata)
│   ├── globals.css               # Tailwind base + custom animations
│   └── api/
│       ├── players/route.ts      # GET  — fetch all players from Airtable
│       ├── sessions/route.ts     # GET  — fetch all sessions from Airtable
│       ├── attendance/route.ts   # POST — persist attendance for a session
│       ├── solve/route.ts        # POST — run LP solver, save teams to Airtable
│       ├── teams/route.ts        # GET/DELETE — read or clear teams for a session
│       └── admin-auth/route.ts   # POST — verify admin password
├── components/
│   ├── PlayerCard.tsx            # Photo card with hover actions
│   ├── RosterPanel.tsx           # Slide-in panel for adding/removing players
│   ├── SessionSelect.tsx         # Custom dropdown for session selection
│   ├── TeamsView.tsx             # Generated teams with drag-and-drop
│   ├── AdminButton.tsx           # Lock/unlock admin mode (PIN modal)
│   └── SplashLoader.tsx          # Full-screen loading screen
├── lib/
│   ├── airtable.ts               # All Airtable I/O — server-side only
│   ├── solver.ts                 # Shared TypeScript types (SolverPlayer, SolverTeam)
│   ├── solver_lp.py              # Python LP solver (reads stdin JSON, writes stdout JSON)
│   └── constants.ts              # Client-safe constants (e.g. Airtable UI URLs)
├── tests/
│   └── solver.test.ts            # Vitest tests for solver_lp.py
├── public/
│   ├── cougars.avif              # Team logo
│   └── cougars_background.png   # Background texture
├── requirements.txt              # Python dependencies (PuLP)
└── .env.local                    # Secret keys — not committed
```

---

## Solver

The LP solver (`lib/solver_lp.py`) is called by the `/api/solve` route:

1. **Input** — JSON array of player objects on stdin
2. **Phase 1** — maximise the number of Cougar-flagged players assigned to a single "Cougars" team
3. **Phase 2** — lock that Cougar count, then minimise `1000 × size_spread + rating_spread`
4. **Output** — same player objects with a `"team"` field added, on stdout

Team count is derived automatically: each team targets 3–7 players. Position constraints (≥1 F and ≥1 D per team) are only applied when enough of each position type exist to cover every team.

See [`.github/kb/js-solver-port.md`](../.github/kb/js-solver-port.md) for a complete JavaScript (glpk.js) port if the Python dependency needs to be removed.

---

## Deployment

The app is configured for **Fly.io** (`fly.toml`, `Dockerfile`). The Docker image is built on a Node base with Python 3 and PuLP pre-installed.

```bash
fly deploy
```

Secrets must be set on the Fly app:

```bash
fly secrets set AIRTABLE_API=... ADMIN_PASSWORD=...
```

