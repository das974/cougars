import { NextRequest, NextResponse } from 'next/server';
import { fetchPlayers } from '@/lib/airtable';

export async function GET(req: NextRequest) {
  try {
    const isAdmin = req.cookies.get('admin_auth')?.value === '1';
    const players = await fetchPlayers();
    const payload = isAdmin ? players : players.map(({ rating: _r, ...p }) => p);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch players';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
