# LP Team Solver — Technical Reference

`solver_lp.py` is a Python script that reads a list of players from **stdin** and writes back the same players with a `team` field assigned, using a two-phase integer linear programme (ILP) solved by [PuLP](https://coin-or.github.io/pulp/) with the bundled CBC solver.

---

## Interface

```
python3 solver_lp.py < players.json > assigned.json
```

### Input (stdin)

A JSON array of player objects:

```json
[
  { "id": "rec123", "name": "Alice", "position": "F", "rating": 75, "cougar": false },
  { "id": "rec456", "name": "Bob",   "position": "D", "rating": 60, "cougar": true  }
]
```

| Field      | Type    | Description                                      |
|------------|---------|--------------------------------------------------|
| `id`       | string  | Unique record ID (passed through unchanged)      |
| `name`     | string  | Player display name (passed through unchanged)   |
| `position` | string  | `"F"` (forward) or `"D"` (defender)             |
| `rating`   | number  | Skill rating — higher is better, no fixed scale  |
| `cougar`   | boolean | `true` if the player is a Battersea Cougar       |

Players with any other `position` value are silently excluded from assignment.

### Output (stdout)

The same array with a `"team"` field added to each object:

```json
[
  { "id": "rec123", "name": "Alice", "position": "F", "rating": 75, "cougar": false, "team": "White" },
  { "id": "rec456", "name": "Bob",   "position": "D", "rating": 60, "cougar": true,  "team": "Cougars" }
]
```

Team names are drawn from `['White', 'Black', 'Cougars', 'Red', 'Gold']` in that order.  
The `"Cougars"` label is always assigned to whichever team receives the most cougar-flagged players (see Phase 1 below).

---

## Team count

The number of teams is chosen automatically by `compute_n_teams(n_players)`:

- Iterates from 2 teams upward.
- Picks the smallest `n` where every team can have between **3 and 7** players (i.e. `floor(n_players / n) ≥ 3` and `ceil(n_players / n) ≤ 7`).
- Falls back to `ceil(n_players / 7)` if no such `n` exists.

| Players | Teams | Sizes        |
|---------|-------|--------------|
| 6–7     | 2     | 3–4 each     |
| 8–14    | 2–3   | 3–7 each     |
| 15–21   | 3     | 5–7 each     |
| 22–28   | 4     | 5–7 each     |

---

## Optimisation model

The solver is called twice — once per phase — both using the same `_build_prob` helper.

### Decision variables

| Variable      | Type    | Meaning                                                    |
|---------------|---------|------------------------------------------------------------|
| `x[i][t]`     | binary  | 1 if player `i` is assigned to team `t`                   |
| `y[t]`        | binary  | 1 if team `t` is the designated "Cougars" team            |
| `w[i,t]`      | binary  | 1 if cougar player `i` is on the Cougars team (= `x[i][t] AND y[t]`) |
| `max_rating`  | continuous | Maximum total rating across all teams                   |
| `min_rating`  | continuous | Minimum total rating across all teams                   |
| `max_size`    | integer | Maximum headcount across all teams                         |
| `min_size`    | integer | Minimum headcount across all teams                         |
| `max_def`     | integer | Maximum number of defenders on any single team             |
| `min_def`     | integer | Minimum number of defenders on any single team             |

### Hard constraints

1. **Unique assignment** — each eligible player is on exactly one team:  
   $\sum_t x_{i,t} = 1 \quad \forall i$

2. **Exactly one Cougars team** — exactly one team gets the Cougars label:  
   $\sum_t y_t = 1$

3. **Team size bounds**:  
   $3 \leq \text{size}(t) \leq 7 \quad \forall t$

4. **Position coverage** (applied only when there are enough of each type to cover every team — e.g. skipped if there is only 1 defender across 3 teams):  
   $\sum_{i \in D} x_{i,t} \geq 1 \quad \forall t$ &nbsp;&nbsp; and &nbsp;&nbsp; $\sum_{i \in F} x_{i,t} \geq 1 \quad \forall t$

### Phase 1 — Concentrate Cougars

**Objective:** maximise the number of cougar-flagged players on the designated Cougars team.

$$\max \sum_{i \in \text{cougars},\, t} w_{i,t}$$

The `w[i,t]` linearisation of the AND condition uses standard big-M-free constraints:

$$w_{i,t} \leq x_{i,t}, \quad w_{i,t} \leq y_t, \quad w_{i,t} \geq x_{i,t} + y_t - 1$$

The optimal cougar count `max_cougars` is extracted and carried forward.

### Phase 2 — Balance teams

**Objective:** minimise a weighted spread penalty, subject to the cougar count being at least `max_cougars`:

$$\min \; 1000 \cdot (\text{max\_size} - \text{min\_size}) + 500 \cdot (\text{max\_def} - \text{min\_def}) + (\text{max\_rating} - \text{min\_rating})$$

| Term | Weight | Effect |
|------|--------|--------|
| size spread | 1000 | Equal headcount is the top priority |
| defender spread | 500 | Defenders are distributed evenly before rating is considered |
| rating spread | 1 | Within equal-size, equal-def teams, balance total skill ratings |

The weights are deliberately hierarchical: a size imbalance of 1 player is worth 1000 points of rating spread, and a defender imbalance of 1 defender is worth 500 rating points. This means the solver will always prefer equal-size, evenly-defended teams even if it costs significant rating balance.

---

## Team naming

After Phase 2, the team that received the highest number of cougar-flagged players is labelled `"Cougars"`. The remaining team names are assigned in the order `['White', 'Black', 'Red', 'Gold']`.

---

## Integration

The script is called by `app/api/solve/route.ts` via Node's `child_process.execSync`:

```ts
const stdout = execSync(`python3 "${SOLVER_PY}"`, {
  input: JSON.stringify(players),
  timeout: 30_000,
});
```

Errors are surfaced as non-zero exit codes; any text written to **stderr** is captured by `execSync` and re-thrown as a Node `Error`.

---

## Dependencies

```
pulp>=2.8          # LP modelling + bundled CBC solver
```

Declared in `team-manager/requirements.txt` and auto-installed by `.devcontainer/post-start.sh`.

---

## Running standalone

```bash
# From team-manager/
echo '[{"id":"p1","name":"Alice","position":"F","rating":75,"cougar":false},
       {"id":"p2","name":"Bob",  "position":"D","rating":60,"cougar":true }]' \
  | python3 lib/solver_lp.py
```

## Running tests

```bash
cd team-manager
npm test
```

Tests live in `tests/solver.test.ts` and invoke the Python script directly via `child_process.execSync`, covering small sessions, full sessions, and real session snapshots with anonymised player data.
