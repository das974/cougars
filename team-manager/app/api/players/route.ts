import { NextResponse } from 'next/server';
import { fetchPlayers } from '@/lib/airtable';

export async function GET() {
  try {
    const players = await fetchPlayers();
    return NextResponse.json(players);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch players';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
