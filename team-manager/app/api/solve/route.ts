import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import type { SolverPlayer, SolverTeam } from '@/lib/solver';
import { fetchTeams, deleteTeams, saveTeams } from '@/lib/airtable';

const SOLVER_PY = path.join(process.cwd(), 'lib', 'solver_lp.py');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const players: SolverPlayer[] = body.players;
    const sessionId: string | undefined = body.sessionId;

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'players array is required' }, { status: 400 });
    }

    // Delete any previously saved teams for this session
    if (sessionId) {
      const existing = await fetchTeams(sessionId);
      await deleteTeams(existing.map((t) => t.id));
    }

    const stdout = execSync(`python3 "${SOLVER_PY}"`, {
      input: JSON.stringify(players),
      timeout: 30_000,
    });

    type AssignedPlayer = SolverPlayer & { team: string };
    const assigned: AssignedPlayer[] = JSON.parse(stdout.toString());

    const teamsMap = new Map<string, SolverTeam>();
    for (const p of assigned) {
      if (!teamsMap.has(p.team)) {
        teamsMap.set(p.team, { name: p.team, players: [], totalRating: 0 });
      }
      const t = teamsMap.get(p.team)!;
      const sp: SolverPlayer = {
        id: p.id, name: p.name, position: p.position, rating: p.rating, cougar: p.cougar,
      };
      t.players.push(sp);
      t.totalRating += p.rating;
    }

    const teams = Array.from(teamsMap.values());

    // Sanity check: every input player must appear in exactly one team
    const assignedIds = new Set(assigned.map((p) => p.id));
    const missingIds = players.filter((p) => !assignedIds.has(p.id)).map((p) => p.name);
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Solver did not assign all players. Missing: ${missingIds.join(', ')}` },
        { status: 500 },
      );
    }

    // Persist new teams to Airtable
    if (sessionId) {
      await saveTeams(sessionId, teams);
    }

    return NextResponse.json({ teams });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Solver error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
