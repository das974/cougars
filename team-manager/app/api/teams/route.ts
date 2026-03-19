import { NextRequest, NextResponse } from 'next/server';
import { fetchTeams, deleteTeams, updateTeamPlayers } from '@/lib/airtable';
import { requireAppAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const deny = await requireAppAuth(req);
  if (deny) return deny;
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  try {
    const teams = await fetchTeams(sessionId);
    return NextResponse.json({ teams });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch teams';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAppAuth(req);
  if (deny) return deny;
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  try {
    const teams = await fetchTeams(sessionId);
    await deleteTeams(teams.map((t) => t.id));
    return NextResponse.json({ deleted: teams.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete teams';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAppAuth(req);
  if (deny) return deny;
  try {
    const body = await req.json();
    const { sessionId, teams } = body as {
      sessionId: string;
      teams: Array<{ name: string; playerIds: string[] }>;
    };
    if (!sessionId || !Array.isArray(teams)) {
      return NextResponse.json({ error: 'sessionId and teams are required' }, { status: 400 });
    }
    // Fetch current records to get Airtable IDs, then match by name
    const stored = await fetchTeams(sessionId);
    const updates = teams
      .map((t) => {
        const record = stored.find((s) => s.name === t.name);
        if (!record) return null;
        return { id: record.id, playerIds: t.playerIds };
      })
      .filter((u): u is { id: string; playerIds: string[] } => u !== null);
    await updateTeamPlayers(updates);
    return NextResponse.json({ updated: updates.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update teams';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
