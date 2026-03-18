#!/usr/bin/env python3
"""
LP team solver — reads a JSON array of player objects from stdin,
assigns them to balanced teams using PuLP/CBC, and writes the
result (same objects with an added 'team' key) as JSON to stdout.

Number of teams is derived automatically: each team should have 6–7 players.

Called by /api/solve/route.ts via child_process.execSync.
"""

import json
import sys
from pulp import LpProblem, LpMinimize, LpVariable, lpSum, value, PULP_CBC_CMD

# Team names in priority order — Cougars is always available as the last team
ALL_TEAM_NAMES = ['White', 'Black', 'Cougars', 'Red', 'Gold']
MIN_TEAM_SIZE = 3
MAX_TEAM_SIZE = 7


def compute_n_teams(n_players: int) -> int:
    """Return the number of teams so each has 3–7 players where possible."""
    for n in range(2, n_players + 1):
        lo = n_players // n
        hi = -(- n_players // n)  # ceil
        if lo >= MIN_TEAM_SIZE and hi <= MAX_TEAM_SIZE:
            return n
    # Fallback: fewest teams that keep each under MAX_TEAM_SIZE
    return max(2, -(- n_players // MAX_TEAM_SIZE))


def get_team_names(n: int) -> list[str]:
    """Get n team names, always ending with 'Cougars'."""
    others = [name for name in ALL_TEAM_NAMES if name != 'Cougars']
    return others[:n - 1] + ['Cougars']


def _build_prob(players, teams, d_idx, f_idx, cougar_idx, n_players):
    n = len(players)
    prob = LpProblem("team_assignment", LpMinimize)
    x = [[LpVariable(f"x_{i}_{t}", cat='Binary') for t in teams] for i in range(n)]
    max_rating = LpVariable("max_rating", lowBound=0)
    min_rating = LpVariable("min_rating", lowBound=0)
    max_size   = LpVariable("max_size", lowBound=0, cat='Integer')
    min_size   = LpVariable("min_size", lowBound=0, cat='Integer')
    y = [LpVariable(f"y_{t}", cat='Binary') for t in teams]

    prob += lpSum(y[t] for t in teams) == 1

    w = {}
    for i in cougar_idx:
        for t in teams:
            w[i, t] = LpVariable(f"w_{i}_{t}", cat='Binary')
            prob += w[i, t] <= x[i][t]
            prob += w[i, t] <= y[t]
            prob += w[i, t] >= x[i][t] + y[t] - 1

    best_c = lpSum(w[i, t] for i in cougar_idx for t in teams)

    for i in range(n):
        if players[i]['position'] in ('D', 'F'):
            prob += lpSum(x[i][t] for t in teams) == 1
        else:
            prob += lpSum(x[i][t] for t in teams) == 0

    n_teams = len(teams)
    for t in teams:
        prob += lpSum(x[i][t] for i in range(n)) <= MAX_TEAM_SIZE
        # Enforce min size only when the numbers allow it
        if n_players >= n_teams * MIN_TEAM_SIZE:
            prob += lpSum(x[i][t] for i in range(n)) >= MIN_TEAM_SIZE

    team_size   = [lpSum(x[i][t] for i in range(n)) for t in teams]
    team_rating = [lpSum(players[i]['rating'] * x[i][t] for i in range(n)) for t in teams]

    for t in teams:
        prob += team_size[t]   <= max_size
        prob += team_size[t]   >= min_size
        prob += team_rating[t] <= max_rating
        prob += team_rating[t] >= min_rating

    # Only enforce position-per-team constraints when there are enough of each
    # position to cover every team. If not (e.g. 1 defender across 2 teams),
    # skip the constraint so the LP remains feasible.
    for t in teams:
        if len(d_idx) >= n_teams:
            prob += lpSum(x[i][t] for i in d_idx) >= 1
        if len(f_idx) >= n_teams:
            prob += lpSum(x[i][t] for i in f_idx) >= 1

    return prob, x, y, w, best_c, max_rating, min_rating, max_size, min_size


def assign_teams(players):
    eligible   = [p for p in players if p['position'] in ('D', 'F')]
    n_players  = len(eligible)
    n_teams    = compute_n_teams(n_players)
    teams      = range(n_teams)
    d_idx      = [i for i, p in enumerate(players) if p['position'] == 'D']
    f_idx      = [i for i, p in enumerate(players) if p['position'] == 'F']
    cougar_idx = [i for i, p in enumerate(players) if p.get('cougar')]

    # Phase 1 — maximise Cougars concentrated on one team
    prob1, x1, y1, w1, best_c1, *_ = _build_prob(players, teams, d_idx, f_idx, cougar_idx, n_players)
    prob1 += -best_c1
    prob1.solve(PULP_CBC_CMD(msg=0))
    max_cougars = int(round(value(best_c1)))

    # Phase 2 — lock Cougar count, minimise size spread (×1000) + rating spread
    prob2, x2, y2, w2, best_c2, max_rating, min_rating, max_size, min_size = \
        _build_prob(players, teams, d_idx, f_idx, cougar_idx, n_players)
    prob2 += best_c2 >= max_cougars
    prob2 += 1000 * (max_size - min_size) + (max_rating - min_rating)
    prob2.solve(PULP_CBC_CMD(msg=0))

    # Name teams — place 'Cougars' label on whichever team has the most Cougars
    team_names    = get_team_names(n_teams)
    if cougar_idx:
        cougar_counts = [sum(value(x2[i][t]) for i in cougar_idx) for t in teams]
        cougar_team   = int(max(teams, key=lambda t: cougar_counts[t]))
        cougars_pos   = team_names.index('Cougars')
        team_names[cougar_team], team_names[cougars_pos] = 'Cougars', team_names[cougar_team]

    result = []
    for i, p in enumerate(players):
        if p['position'] not in ('D', 'F'):
            continue
        for t in teams:
            if value(x2[i][t]) > 0.5:
                result.append({**p, 'team': team_names[t]})
                break

    return result


if __name__ == '__main__':
    players = json.loads(sys.stdin.read())
    result  = assign_teams(players)
    print(json.dumps(result))

