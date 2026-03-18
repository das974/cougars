import { NextRequest, NextResponse } from 'next/server';
import { fetchTeams, deleteTeams } from '@/lib/airtable';

export async function GET(req: NextRequest) {
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
