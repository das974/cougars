import { NextResponse } from 'next/server';
import { fetchSessions } from '@/lib/airtable';

export async function GET() {
  try {
    const sessions = await fetchSessions();
    return NextResponse.json(sessions);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
