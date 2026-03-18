/**
 * solver.test.ts
 *
 * Tests for solver_lp.py via child_process (all tests in one language).
 * Run: npm test
 *
 * Player names and record IDs are anonymised — do not add real names here.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const SOLVER = path.resolve(__dirname, '../lib/solver_lp.py');

interface SolverPlayer {
  id: string;
  name: string;
  position: string;
  rating: number;
  cougar: boolean;
  team: string;
}

function runSolver(players: object[]): SolverPlayer[] {
  const input = JSON.stringify(players);
  const output = execSync(`python3 "${SOLVER}"`, {
    input,
    encoding: 'utf-8',
    timeout: 60_000,
  });
  return JSON.parse(output);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * Small session — 6 players (5 forwards, 1 defender).
 * Mirrors the shape of a real low-attendance session.
 * Expected: 2 teams of 3; position constraints relaxed when too few of one type.
 */
const SMALL_SESSION_PLAYERS = [
  { id: 'pid-001', name: 'Player 1', position: 'F', rating: 80, cougar: false },
  { id: 'pid-002', name: 'Player 2', position: 'D', rating: 55, cougar: true  },
  { id: 'pid-003', name: 'Player 3', position: 'F', rating: 65, cougar: true  },
  { id: 'pid-004', name: 'Player 4', position: 'F', rating: 70, cougar: true  },
  { id: 'pid-005', name: 'Player 5', position: 'F', rating: 50, cougar: true  },
  { id: 'pid-006', name: 'Player 6', position: 'F', rating: 20, cougar: false },
];

/**
 * Full session — 18 players, balanced mix of forwards and defenders.
 * Expected: 3 teams of 6; each team has at least 1 F and 1 D.
 */
const FULL_SESSION_PLAYERS = [
  { id: 'pid-001', name: 'Player 1',  position: 'F', rating: 80, cougar: false },
  { id: 'pid-002', name: 'Player 2',  position: 'F', rating: 50, cougar: false },
  { id: 'pid-003', name: 'Player 3',  position: 'F', rating: 75, cougar: false },
  { id: 'pid-004', name: 'Player 4',  position: 'D', rating: 55, cougar: true  },
  { id: 'pid-005', name: 'Player 5',  position: 'D', rating: 65, cougar: false },
  { id: 'pid-006', name: 'Player 6',  position: 'F', rating: 90, cougar: false },
  { id: 'pid-007', name: 'Player 7',  position: 'F', rating: 40, cougar: true  },
  { id: 'pid-008', name: 'Player 8',  position: 'F', rating: 20, cougar: false },
  { id: 'pid-009', name: 'Player 9',  position: 'D', rating: 65, cougar: true  },
  { id: 'pid-010', name: 'Player 10', position: 'D', rating: 75, cougar: false },
  { id: 'pid-011', name: 'Player 11', position: 'D', rating: 70, cougar: false },
  { id: 'pid-012', name: 'Player 12', position: 'D', rating: 80, cougar: false },
  { id: 'pid-013', name: 'Player 13', position: 'F', rating: 65, cougar: true  },
  { id: 'pid-014', name: 'Player 14', position: 'F', rating: 70, cougar: true  },
  { id: 'pid-015', name: 'Player 15', position: 'F', rating: 70, cougar: false },
  { id: 'pid-016', name: 'Player 16', position: 'F', rating: 40, cougar: false },
  { id: 'pid-017', name: 'Player 17', position: 'F', rating: 50, cougar: true  },
  { id: 'pid-018', name: 'Player 18', position: 'F', rating: 20, cougar: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function teamMap(result: SolverPlayer[]): Record<string, SolverPlayer[]> {
  return result.reduce<Record<string, SolverPlayer[]>>((acc, p) => {
    (acc[p.team] ??= []).push(p);
    return acc;
  }, {});
}

// ── Tests: March 27 session (6 players → 2 teams of 3) ───────────────────────

describe('Small session (6 players)', () => {
  let result: SolverPlayer[];

  beforeAll(() => {
    result = runSolver(SMALL_SESSION_PLAYERS);
  });

  it('assigns all 6 players', () => {
    expect(result).toHaveLength(6);
  });

  it('assigns each player exactly once', () => {
    const ids = result.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(6);
  });

  it('produces exactly 2 teams', () => {
    const teams = new Set(result.map((p) => p.team));
    expect(teams.size).toBe(2);
  });

  it('each team has at least 3 players', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.length, `Team ${name} too small`).toBeGreaterThanOrEqual(3);
    }
  });

  it('Cougars team concentrates the cougar players', () => {
    const teams = teamMap(result);
    const cougarTeam = teams['Cougars'] ?? [];
    const otherTeams = Object.entries(teams)
      .filter(([name]) => name !== 'Cougars')
      .map(([, players]) => players);

    const cougarCount = cougarTeam.filter((p) => p.cougar).length;
    const maxOther = Math.max(...otherTeams.map((t) => t.filter((p) => p.cougar).length));
    expect(cougarCount).toBeGreaterThanOrEqual(maxOther);
  });
});

// ── Tests: full 18-player session ────────────────────────────────────────────

describe('Full session (18 players)', () => {
  let result: SolverPlayer[];

  beforeAll(() => {
    result = runSolver(FULL_SESSION_PLAYERS);
  });

  it('assigns all 18 players', () => {
    expect(result).toHaveLength(18);
  });

  it('assigns each player exactly once', () => {
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(18);
  });

  it('produces exactly 3 teams', () => {
    const teams = new Set(result.map((p) => p.team));
    expect(teams.size).toBe(3);
  });

  it('each team has at least 3 players', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.length, `Team ${name} too small`).toBeGreaterThanOrEqual(3);
    }
  });

  it('each team has at least 1 forward and 1 defender', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.some((p) => p.position === 'F'), `${name} has no forward`).toBe(true);
      expect(players.some((p) => p.position === 'D'), `${name} has no defender`).toBe(true);
    }
  });

  it('Cougars team concentrates the cougar players', () => {
    const teams = teamMap(result);
    const cougarTeam = teams['Cougars'] ?? [];
    const otherTeams = Object.entries(teams)
      .filter(([name]) => name !== 'Cougars')
      .map(([, players]) => players);

    const cougarCount = cougarTeam.filter((p) => p.cougar).length;
    const maxOther = Math.max(...otherTeams.map((t) => t.filter((p) => p.cougar).length));
    expect(cougarCount).toBeGreaterThanOrEqual(maxOther);
  });
});
