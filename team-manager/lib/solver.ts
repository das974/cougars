/**
 * solver.ts — shared TypeScript types for team data.
 *
 * The actual LP solve is performed server-side by lib/solver_lp.py (PuLP/CBC),
 * invoked via child_process in app/api/solve/route.ts.
 * These types are used across page.tsx, TeamsView, and the solve route.
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
