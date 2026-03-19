import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import type { SolverPlayer, SolverTeam } from '@/lib/solver';
import { fetchPlayers, fetchSessions, fetchTeams, deleteTeams, saveTeams } from '@/lib/airtable';
import { requireAppAuth } from '@/lib/auth';

const SOLVER_PY = path.join(process.cwd(), 'lib', 'solver_lp.py');

export async function POST(req: NextRequest) {
  const deny = await requireAppAuth(req);
  if (deny) return deny;
  try {
    const body = await req.json();
    const sessionId: string | undefined = body.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Fetch attending player IDs from the session record (server-side, trusted)
    const sessions = await fetchSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.attendingIds.length === 0) {
      return NextResponse.json({ error: 'No players attending this session' }, { status: 400 });
    }

    // Fetch full player records (includes ratings — server-side only)
    const allPlayers = await fetchPlayers();
    const attendingSet = new Set(session.attendingIds);
    const players: SolverPlayer[] = allPlayers
      .filter((p) => attendingSet.has(p.id))
      .map(({ id, name, position, rating, cougar }) => ({ id, name, position, rating, cougar }));

    if (players.length === 0) {
      return NextResponse.json({ error: 'No valid players found for session' }, { status: 400 });
    }

    // Delete any previously saved teams for this session
    const existing = await fetchTeams(sessionId);
    await deleteTeams(existing.map((t) => t.id));

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
    await saveTeams(sessionId, teams);

    return NextResponse.json({ teams });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Solver error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
