import { NextResponse } from 'next/server';
import { fetchPlayers } from '@/lib/airtable';

export async function GET() {
  const players = await fetchPlayers();
  return NextResponse.json(players);
}
