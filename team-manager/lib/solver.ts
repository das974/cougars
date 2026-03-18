/**
 * solver.ts — greedy balanced team assignment.
 *
 * Mirrors the logic of team_solver.py:
 *   1. Maximise Cougars on one team ("Cougars" team).
 *   2. Balance by rating spread and team size.
 *
 * This is a pure-JS approximation. For the full LP solution, wire the
 * Python solver via a sidecar endpoint or Vercel Python function.
 */

export interface SolverPlayer {
  id: string;
  name: string;
  position: 'F' | 'D' | '';
  rating: number;
  cougar: boolean;
}

export interface SolverTeam {
  name: string;
  players: SolverPlayer[];
  totalRating: number;
}

const TEAM_NAMES = ['White', 'Black', 'Cougars'] as const;

export function assignTeams(players: SolverPlayer[]): SolverTeam[] {
  const eligible = players.filter((p) => p.position === 'F' || p.position === 'D');
  if (eligible.length === 0) throw new Error('No eligible players (need F or D position).');
  if (eligible.length < 3) throw new Error('Need at least 3 eligible players.');

  const teams: SolverTeam[] = TEAM_NAMES.map((name) => ({ name, players: [], totalRating: 0 }));

  // Sort: Cougars first (they go to the Cougars team), then desc by rating
  const sorted = [...eligible].sort((a, b) => {
    if (a.cougar !== b.cougar) return a.cougar ? -1 : 1;
    return b.rating - a.rating;
  });

  // Snake-draft into teams to balance ratings
  let dir = 1;
  let idx = 0;
  for (const player of sorted) {
    const team = teams[idx];
    team.players.push(player);
    team.totalRating += player.rating;
    idx += dir;
    if (idx >= teams.length) { idx = teams.length - 1; dir = -1; }
    else if (idx < 0) { idx = 0; dir = 1; }
  }

  // Rename: the team with the most Cougars gets the "Cougars" name
  const cougarCounts = teams.map((t) => t.players.filter((p) => p.cougar).length);
  const cougarTeamIdx = cougarCounts.indexOf(Math.max(...cougarCounts));
  const originalCougarsIdx = teams.findIndex((t) => t.name === 'Cougars');
  if (cougarTeamIdx !== originalCougarsIdx) {
    const tmp = teams[cougarTeamIdx].name;
    teams[cougarTeamIdx].name = 'Cougars';
    teams[originalCougarsIdx].name = tmp;
  }

  return teams;
}
