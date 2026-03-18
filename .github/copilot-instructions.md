# Battersea Cougars — Copilot Instructions

## Project overview

This is the repository for the **Battersea Cougars** roller hockey team management tools. The primary application is a **Session Team Manager**: a web app that lets a coach select which players are attending a Friday training session and then automatically generate balanced teams using a linear-programming (LP) solver.

---

## Repository layout

```
/src
├── .devcontainer/       # Dev container (Dockerfile, docker-compose, post-start.sh)
├── .github/             # Copilot instructions (this file) + kb/ articles
└── team-manager/        # ← The Next.js application (see below)
```

### `team-manager/` — Next.js application

```
team-manager/
├── app/
│   ├── page.tsx                  # Main UI — single 'use client' component
│   ├── layout.tsx                # Root layout (Geist font, metadata)
│   ├── globals.css               # Tailwind base + custom keyframe animations
│   └── api/
│       ├── players/route.ts      # GET    — fetch all players from Airtable
│       ├── sessions/route.ts     # GET    — fetch all sessions from Airtable
│       ├── attendance/route.ts   # POST   — persist attendance for a session
│       ├── solve/route.ts        # POST   — invoke LP solver, save teams
│       ├── teams/route.ts        # GET/DELETE — read or clear teams for a session
│       └── admin-auth/route.ts   # POST   — verify admin password
├── components/
│   ├── PlayerCard.tsx            # Photo card (photo, name, position, rating, hover actions)
│   ├── RosterPanel.tsx           # Slide-in panel for adding/removing players
│   ├── SessionSelect.tsx         # Custom dropdown for session selection
│   ├── TeamsView.tsx             # Generated teams with drag-and-drop reassignment
│   ├── AdminButton.tsx           # Lock/unlock admin mode via password modal
│   └── SplashLoader.tsx          # Full-screen loading overlay with fade transition
├── lib/
│   ├── airtable.ts               # All Airtable I/O — server-side only
│   ├── solver.ts                 # Shared TS types: SolverPlayer, SolverTeam
│   ├── solver_lp.py              # Python LP solver (reads stdin JSON, writes stdout JSON)
│   └── constants.ts              # Client-safe constants (e.g. Airtable UI URLs)
├── tests/
│   └── solver.test.ts            # Vitest integration tests for solver_lp.py
└── requirements.txt              # Python dependencies (PuLP)
```

---

## Architecture

### Frontend
- **Next.js 15** (App Router), React 19, TypeScript, Tailwind CSS v4.
- `app/page.tsx` is a single `'use client'` component that owns all UI state. SWR is used for data fetching (`/api/players`, `/api/sessions`).
- Attendance changes are debounced (600 ms) before being persisted to Airtable. Teams are cleared immediately when attendance changes.
- Admin mode is unlocked via a password (`AdminButton`) and reveals player ratings, the Generate Teams button, and Airtable edit links on player cards.

### Backend / API routes
- All API routes are Next.js Route Handlers (`app/api/*/route.ts`).
- Airtable access is **server-side only** — the `AIRTABLE_API` key is never exposed to the browser.
- The solve route calls `solver_lp.py` via `child_process.execSync`, passing the attending players as JSON on stdin and reading the result from stdout.

### LP solver (`solver_lp.py`)
- Written in Python 3 using **PuLP** with the bundled CBC solver.
- Reads a JSON array of player objects from stdin; writes the same array with an added `"team"` key to stdout.
- Dynamically determines team count: each team targets 3–7 players.
- Two-phase optimisation:
  1. Maximise Cougar-flagged players concentrated on a single team (the "Cougars" team).
  2. Lock that Cougar count, then minimise `1000 × size_spread + rating_spread`.
- Position constraints (≥1 D and ≥1 F per team) are only applied when enough of each position type exist to cover all teams.
- See `.github/kb/js-solver-port.md` for a complete JavaScript (glpk.js) port.

### Data model (Airtable)
The Airtable base (`appYLV6Emy6bpluRY`) has three tables, accessed via field IDs:

| Table     | Key fields                                                       |
|-----------|------------------------------------------------------------------|
| Players   | name, position (F/D), rating (number), cougar (checkbox), photo |
| Sessions  | date (ISO), players (linked → Players)                          |
| Teams     | name, session (linked → Sessions), players (linked → Players)   |

All Airtable queries use `returnFieldsByFieldId: true`. Schema constants (`P_NAME`, `S_DATE`, etc.) are defined in `lib/airtable.ts`.

---

## Key conventions

- **TypeScript** everywhere in the Next.js app; Python only for the solver.
- Use **field ID constants** (e.g. `P_NAME`, `S_DATE`) instead of field names when querying Airtable.
- API routes return `{ error: string }` JSON with an appropriate HTTP status on failure.
- Tailwind utility classes for all styling — no CSS modules or styled-components.
- Client components must not import from `lib/airtable.ts` (server-only). Shared client-safe values go in `lib/constants.ts`.
- Python deps are declared in `team-manager/requirements.txt` and auto-installed by `.devcontainer/post-start.sh`.

## Dev environment

- Dev container based on `node:24`; Python 3 is available via `python3`.
- Install JS deps: `cd team-manager && npm install`
- Run dev server: `cd team-manager && npm run dev` (port 3000)
- Run tests: `cd team-manager && npm test`
- The app is deployable to **Fly.io** (`team-manager/fly.toml`, `team-manager/Dockerfile`).
- Required env vars in `team-manager/.env.local`:
  - `AIRTABLE_API` — Airtable personal access token
  - `ADMIN_PASSWORD` — password to unlock admin mode in the UI

