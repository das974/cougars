# Battersea Cougars — Copilot Instructions

## Project overview

This is the monorepo for the **Battersea Cougars** roller hockey team management tools. The primary application is a **Session Team Manager**: a web app that lets a coach select which players are attending a Friday training session and then automatically generate balanced teams using a linear-programming (LP) solver.

---

## Monorepo layout

```
/src
├── .devcontainer/       # Dev container (Dockerfile, docker-compose, post-start.sh)
├── .github/             # Copilot instructions (this file)
├── team-manager/        # ← The main Next.js application (see below)
├── team-manager/        # ← The main Next.js application (see below)
└── __BAK__/             # Archived/legacy code – do not modify or reference
```

### `team-manager/` — Next.js application

```
team-manager/
├── app/
│   ├── page.tsx                  # Single-page client component (main UI)
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── players/route.ts      # GET  – fetch all players from Airtable
│       ├── sessions/route.ts     # GET  – fetch all sessions from Airtable
│       ├── attendance/route.ts   # POST – update attending player IDs on a session
│       ├── solve/route.ts        # POST – invoke the LP solver, persist teams
│       ├── teams/route.ts        # GET/POST – read/write team records
│       └── admin-auth/route.ts   # POST – simple admin PIN check
├── components/
│   ├── PlayerCard.tsx            # Individual player card (photo, name, position, rating)
│   ├── RosterPanel.tsx           # Slide-in panel listing attending players
│   ├── SessionSelect.tsx         # Dropdown to choose the training session
│   ├── TeamsView.tsx             # Displays generated teams; supports drag-and-drop
│   ├── AdminButton.tsx           # Lock/unlock admin mode
│   └── SplashLoader.tsx          # Full-screen loading overlay with transition
├── lib/
│   ├── airtable.ts               # All Airtable access (server-side only)
│   ├── solver.ts                 # Calls solver_lp.py via child_process, returns SolverTeam[]
│   └── solver_lp.py              # Python LP solver (PuLP/CBC)
└── public/
    ├── cougars.avif              # Team logo
    └── cougars_background.png
```

---

## Architecture

### Frontend
- **Next.js 15** (App Router), React 19, TypeScript, Tailwind CSS.
- `app/page.tsx` is a single `'use client'` component that owns all UI state. SWR is used for data fetching (`/api/players`, `/api/sessions`).
- Attendance changes are debounced (600 ms) before being persisted to Airtable.
- Admin mode is unlocked via a PIN (`AdminButton`) and controls visibility of player ratings and the solve button.

### Backend / API routes
- All API routes are Next.js Route Handlers (`app/api/*/route.ts`).
- Airtable access is **server-side only** — the `AIRTABLE_API` key is never exposed to the browser.
- The solve route calls `solver_lp.py` via `child_process.execSync`, passing the attending players as JSON on stdin and reading the result from stdout.

### LP solver (`solver_lp.py`)
- Written in Python 3 using **PuLP** with the bundled CBC solver.
- Reads a JSON array of `Player` objects from stdin; writes an array with an added `"team"` key to stdout.
- Assigns players to exactly three teams: **White**, **Black**, and **Cougars**.
- Two-phase optimisation:
  1. Maximise Cougars (players with `cougar: true`) concentrated on a single team (the "Cougars" team).
  2. Lock that Cougar count, then minimise team size spread (×1000 weight) and rating spread.
- Constraints: each team has at least 1 defender ('D') and 1 forward ('F'); max 7 players per team.

### Data model (Airtable)
The Airtable base (`appYLV6Emy6bpluRY`) has three tables accessible via field IDs:

| Table     | Key fields                                                       |
|-----------|------------------------------------------------------------------|
| Players   | name, position (F/D), rating (number), cougar (checkbox), photo |
| Sessions  | date (ISO), players (linked → Players)                          |
| Teams     | name, session (linked → Sessions), players (linked)             |

All Airtable queries use `returnFieldsByFieldId: true`. See `lib/airtable.ts` for the full schema constants.

---

## Key conventions

- **TypeScript** everywhere in the Next.js app; Python only for the solver.
- Use **field ID constants** (e.g. `P_NAME`, `S_DATE`) instead of field names when querying Airtable.
- API routes throw standard `Response` objects with JSON `{ error: string }` bodies on failure.
- Tailwind utility classes for all styling — no CSS modules or styled-components.
- Python deps are declared in `team-manager/requirements.txt` and auto-installed by `.devcontainer/post-start.sh`.
- The `__BAK__/` directory contains archived/legacy experiments — do not import from or modify it.

## Dev environment

- Dev container based on `node:24`; Python 3 is available via `python3`.
- Install JS deps: `cd team-manager && npm install`
- Run dev server: `cd team-manager && npm run dev` (port 3000)
- The app is also deployable to **Fly.io** (`team-manager/fly.toml`).
- Environment variable required: `AIRTABLE_API` (set in `team-manager/.env.local`).
