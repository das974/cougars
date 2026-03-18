import { NextResponse } from 'next/server';
import { fetchSessions } from '@/lib/airtable';

export async function GET() {
  const sessions = await fetchSessions();
  return NextResponse.json(sessions);
}
