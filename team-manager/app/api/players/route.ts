import { NextRequest, NextResponse } from 'next/server';
import { fetchPlayers } from '@/lib/airtable';
import { requireAppAuth, checkAdminAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const deny = await requireAppAuth(req);
  if (deny) return deny;
  try {
    const isAdmin = await checkAdminAuth(req);
    const players = await fetchPlayers();
    const payload = isAdmin ? players : players.map(({ rating: _r, ...p }) => p);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch players';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
