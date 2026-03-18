# JavaScript Solver Port (glpk.js)

## Overview

The Python LP solver (`lib/solver_lp.py`) can be replaced with a pure-JavaScript implementation that runs in the browser (or in Node.js) using [`glpk.js`](https://github.com/jvail/glpk.js) — GLPK compiled to WebAssembly/asm.js. This eliminates the `child_process` + Python dependency entirely.

The full working implementation was developed in `__BAK__/extension/frontend/solver.js` (excluded from the repository). This article preserves the key design decisions and the complete source for future reference.

---

## When to use this

Consider switching to the JS solver if:

- The deployment target cannot run Python (e.g. Vercel serverless with no Python runtime)
- You want the solve to happen client-side (no server round-trip, works offline)
- You want to remove the `python3` + `pulp`/`cbc` dependency from the dev container

The trade-off is that `glpk.js` is a larger dependency (~3 MB) and the MILP model must be expressed in the lower-level glpk.js constraint format rather than PuLP's DSL.

---

## Dependencies

```bash
npm install glpk.js
```

`glpk.js` ships a single async factory function. It works in both browser (ESM) and Node.js environments.

---

## Algorithm

Identical two-phase MILP to the Python solver:

| Phase | Objective | Notes |
|-------|-----------|-------|
| 1 | **Maximise** Cougars concentrated on a single team | Uses `w[i][t] = x[i][t] AND y[t]` linearisation |
| 2 | **Minimise** `1000×(max_size − min_size) + (max_rating − min_rating)` | Locks Phase 1 Cougar count as a hard constraint |

Constraints:
- Each eligible player (`D` or `F`) assigned to exactly one team
- Exactly one team is designated the "Cougar team" (`y[t]`)
- Max 7 players per team
- At least 1 `D` and 1 `F` per team *(conditioned on enough of each position existing)*

---

## Complete Implementation

```js
/**
 * solver.js — JavaScript port of solver_lp.py
 *
 * Uses glpk.js (GLPK compiled to WebAssembly — runs in browser or Node.js).
 *
 * Public API:
 *   assignTeams(players) → Promise<Array<{ ...player, team: 'Cougars'|'Black'|'White' }>>
 *
 * Each player must have: { recordId, name, position ('D'|'F'|''), rating, cougar }
 */

import GLPK from 'glpk.js';

let _glpk = null;
async function getGLPK() {
    if (!_glpk) _glpk = await GLPK();
    return _glpk;
}

const N_TEAMS       = 3;
const MAX_TEAM_SIZE = 7;
const BASE_TEAMS    = ['White', 'Black', 'Cougars']; // index 2 = Cougar slot

/**
 * Build a glpk.js model for one phase of the two-phase MILP.
 *
 * Phase 1:  maximize  sum(w[i][t])  — Cougars concentrated on one team
 * Phase 2:  minimize  1000*(max_s − min_s) + (max_r − min_r)
 *           with hard constraint:  sum(w[i][t]) >= maxCougars
 */
function buildModel(glpk, players, dIdx, fIdx, cougarIdx, phase, maxCougars = 0) {
    const n = players.length;
    const { GLP_MIN, GLP_MAX, GLP_FX, GLP_LO, GLP_UP } = glpk;
    const con  = [];  // subjectTo array
    const bins = [];  // binary variable names
    const gens = [];  // general integer variable names

    // ── Variable declarations ──────────────────────────────────────────────────
    // x[i][t] = 1 if player i is on team t
    for (let i = 0; i < n; i++)
        for (let t = 0; t < N_TEAMS; t++)
            bins.push(`x_${i}_${t}`);

    // y[t] = 1 if team t is the designated Cougar team
    for (let t = 0; t < N_TEAMS; t++)
        bins.push(`y_${t}`);

    // w[i][t] = x[i][t] AND y[t]  (linearised product)
    for (const i of cougarIdx)
        for (let t = 0; t < N_TEAMS; t++)
            bins.push(`w_${i}_${t}`);

    if (phase === 2) {
        gens.push('max_s', 'min_s');
        // max_r / min_r are continuous — declared implicitly as free vars in glpk.js
    }

    // ── Assignment constraints ─────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
        const pos = players[i].position;
        if (pos === 'D' || pos === 'F') {
            // Each eligible player on exactly one team
            con.push({
                name: `assign_${i}`,
                vars: Array.from({ length: N_TEAMS }, (_, t) => ({ name: `x_${i}_${t}`, coef: 1 })),
                bnds: { type: GLP_FX, lb: 1, ub: 1 },
            });
        } else {
            // Non-eligible players excluded from all teams
            for (let t = 0; t < N_TEAMS; t++)
                con.push({
                    name: `noassign_${i}_${t}`,
                    vars: [{ name: `x_${i}_${t}`, coef: 1 }],
                    bnds: { type: GLP_FX, lb: 0, ub: 0 },
                });
        }
    }

    // Exactly one team is the Cougar team
    con.push({
        name: 'one_cougar_team',
        vars: Array.from({ length: N_TEAMS }, (_, t) => ({ name: `y_${t}`, coef: 1 })),
        bnds: { type: GLP_FX, lb: 1, ub: 1 },
    });

    // Max team size
    for (let t = 0; t < N_TEAMS; t++)
        con.push({
            name: `cap_${t}`,
            vars: Array.from({ length: n }, (_, i) => ({ name: `x_${i}_${t}`, coef: 1 })),
            bnds: { type: GLP_UP, lb: 0, ub: MAX_TEAM_SIZE },
        });

    // At least 1 D and 1 F per team
    // Only applied when enough of that position type exist (avoids infeasibility)
    for (let t = 0; t < N_TEAMS; t++) {
        if (dIdx.length >= N_TEAMS)
            con.push({
                name: `min_d_${t}`,
                vars: dIdx.map(i => ({ name: `x_${i}_${t}`, coef: 1 })),
                bnds: { type: GLP_LO, lb: 1, ub: 0 },
            });
        if (fIdx.length >= N_TEAMS)
            con.push({
                name: `min_f_${t}`,
                vars: fIdx.map(i => ({ name: `x_${i}_${t}`, coef: 1 })),
                bnds: { type: GLP_LO, lb: 1, ub: 0 },
            });
    }

    // ── Linearisation: w[i][t] = x[i][t] AND y[t] ────────────────────────────
    // Standard big-M linearisation for binary product:
    //   w <= x,  w <= y,  w >= x + y - 1
    for (const i of cougarIdx) {
        for (let t = 0; t < N_TEAMS; t++) {
            con.push({ name: `wlex_${i}_${t}`, vars: [{ name: `x_${i}_${t}`, coef: 1 }, { name: `w_${i}_${t}`, coef: -1 }],                                           bnds: { type: GLP_LO, lb: 0,  ub: 0 } });
            con.push({ name: `wley_${i}_${t}`, vars: [{ name: `y_${t}`,       coef: 1 }, { name: `w_${i}_${t}`, coef: -1 }],                                           bnds: { type: GLP_LO, lb: 0,  ub: 0 } });
            con.push({ name: `wgxy_${i}_${t}`, vars: [{ name: `w_${i}_${t}`, coef: 1 }, { name: `x_${i}_${t}`, coef: -1 }, { name: `y_${t}`, coef: -1 }], bnds: { type: GLP_LO, lb: -1, ub: 0 } });
        }
    }

    // ── Objective ─────────────────────────────────────────────────────────────
    let objVars;
    if (phase === 1) {
        // Maximise total Cougars on the designated Cougar team
        objVars = cougarIdx.flatMap(i =>
            Array.from({ length: N_TEAMS }, (_, t) => ({ name: `w_${i}_${t}`, coef: 1 }))
        );
    } else {
        // Lock Cougar count from Phase 1
        con.push({
            name: 'cougar_lock',
            vars: cougarIdx.flatMap(i =>
                Array.from({ length: N_TEAMS }, (_, t) => ({ name: `w_${i}_${t}`, coef: 1 }))
            ),
            bnds: { type: GLP_LO, lb: maxCougars, ub: 0 },
        });

        // max_s >= size(t), min_s <= size(t)  for each team t
        for (let t = 0; t < N_TEAMS; t++) {
            con.push({
                name: `sle_${t}`,
                vars: [{ name: 'max_s', coef: 1 }, ...Array.from({ length: n }, (_, i) => ({ name: `x_${i}_${t}`, coef: -1 }))],
                bnds: { type: GLP_LO, lb: 0, ub: 0 },
            });
            con.push({
                name: `sge_${t}`,
                vars: [...Array.from({ length: n }, (_, i) => ({ name: `x_${i}_${t}`, coef: 1 })), { name: 'min_s', coef: -1 }],
                bnds: { type: GLP_LO, lb: 0, ub: 0 },
            });
            con.push({
                name: `rle_${t}`,
                vars: [{ name: 'max_r', coef: 1 }, ...players.map((p, i) => ({ name: `x_${i}_${t}`, coef: -p.rating }))],
                bnds: { type: GLP_LO, lb: 0, ub: 0 },
            });
            con.push({
                name: `rge_${t}`,
                vars: [...players.map((p, i) => ({ name: `x_${i}_${t}`, coef: p.rating })), { name: 'min_r', coef: -1 }],
                bnds: { type: GLP_LO, lb: 0, ub: 0 },
            });
        }

        objVars = [
            { name: 'max_s', coef: 1000 }, { name: 'min_s', coef: -1000 },
            { name: 'max_r', coef: 1    }, { name: 'min_r', coef: -1    },
        ];
    }

    return {
        name: 'team_assignment',
        objective: { direction: phase === 1 ? GLP_MAX : GLP_MIN, name: 'obj', vars: objVars },
        subjectTo: con,
        binaries: bins,
        generals: gens,
    };
}

/**
 * Assign players to three teams and return each player with a `team` field.
 * Players without a recognised position ('D' or 'F') are excluded from the result.
 */
export async function assignTeams(players) {
    const glpk      = await getGLPK();
    const dIdx      = players.flatMap((p, i) => p.position === 'D' ? [i] : []);
    const fIdx      = players.flatMap((p, i) => p.position === 'F' ? [i] : []);
    const cougarIdx = players.flatMap((p, i) => p.cougar            ? [i] : []);
    const opts      = { msglev: glpk.GLP_MSG_OFF };

    // Phase 1 — maximise Cougars concentrated on the designated team
    const r1 = await Promise.resolve(glpk.solve(buildModel(glpk, players, dIdx, fIdx, cougarIdx, 1), opts));
    const v1 = r1.result.vars;
    let maxCougars = 0;
    for (const i of cougarIdx)
        for (let t = 0; t < N_TEAMS; t++)
            if ((v1[`w_${i}_${t}`] || 0) > 0.5) maxCougars++;

    // Phase 2 — lock Cougar count, minimise size + rating spread
    const r2 = await Promise.resolve(glpk.solve(buildModel(glpk, players, dIdx, fIdx, cougarIdx, 2, maxCougars), opts));
    if (r2.result.status !== glpk.GLP_OPT && r2.result.status !== glpk.GLP_FEAS)
        throw new Error('No feasible team assignment found.');
    const v2 = r2.result.vars;

    // Assign 'Cougars' label to whichever team ended up with the most Cougar players
    const teamNames = [...BASE_TEAMS];
    let bestT = 0, bestCount = -1;
    for (let t = 0; t < N_TEAMS; t++) {
        const count = cougarIdx.filter(i => (v2[`x_${i}_${t}`] || 0) > 0.5).length;
        if (count > bestCount) { bestCount = count; bestT = t; }
    }
    [teamNames[bestT], teamNames[2]] = [teamNames[2], teamNames[bestT]];

    return players
        .map((p, i) => {
            if (p.position !== 'D' && p.position !== 'F') return null;
            for (let t = 0; t < N_TEAMS; t++)
                if ((v2[`x_${i}_${t}`] || 0) > 0.5) return { ...p, team: teamNames[t] };
            return null;
        })
        .filter(Boolean);
}
```

---

## Integration into the Next.js app

### Option A — Client-side (browser)

Replace the `/api/solve` fetch in `page.tsx` with a direct call to `assignTeams()`:

```ts
// page.tsx
import { assignTeams } from '@/lib/solver'; // new JS solver

const result = await assignTeams(attendingPlayers);
```

`glpk.js` is async and non-blocking — it won't freeze the UI even for large sessions.

### Option B — Server-side API route (Node.js)

Replace the `child_process` + Python invocation in `app/api/solve/route.ts`:

```ts
// app/api/solve/route.ts
import { assignTeams } from '@/lib/solver'; // new JS solver

export async function POST(req: Request) {
    const { players } = await req.json();
    const teams = await assignTeams(players);
    // ... persist to Airtable, return response
}
```

Either option removes the Python/PuLP/CBC dependency entirely.

---

## glpk.js model format reference

The glpk.js `solve()` call accepts a plain JS object:

```js
{
    name: string,
    objective: {
        direction: GLP_MIN | GLP_MAX,
        name: string,
        vars: Array<{ name: string, coef: number }>
    },
    subjectTo: Array<{
        name: string,
        vars: Array<{ name: string, coef: number }>,
        bnds: { type: GLP_FX | GLP_LO | GLP_UP | GLP_DB, lb: number, ub: number }
    }>,
    binaries: string[],   // binary integer variables
    generals: string[],   // general integer variables
}
```

Bound types:

| Constant | Meaning |
|----------|---------|
| `GLP_FX` | Fixed: `lb == ub` |
| `GLP_LO` | Lower bound only: `val >= lb` |
| `GLP_UP` | Upper bound only: `val <= ub` |
| `GLP_DB` | Double-bounded: `lb <= val <= ub` |
| `GLP_FR` | Free (no bounds) |

Result status codes: `GLP_OPT` (optimal), `GLP_FEAS` (feasible but not proven optimal), `GLP_INFEAS`, `GLP_NOFEAS`, `GLP_UNBND`.

---

## Known limitations

- The original JS code did **not** condition the `min_d` / `min_f` constraints on `dIdx.length >= N_TEAMS` — this was a bug fixed in the Python solver. The corrected version above includes that fix.
- `glpk.js` does not support warm-starting between the two phases; the model is rebuilt from scratch for Phase 2. This is fine for sessions up to ~25 players.
- `glpk.js` version used during development was `5.x`. The API is stable but check the [changelog](https://github.com/jvail/glpk.js) before upgrading.
