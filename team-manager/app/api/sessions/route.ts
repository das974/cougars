import { NextRequest, NextResponse } from 'next/server';
import { fetchSessions } from '@/lib/airtable';
import { requireAppAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const deny = await requireAppAuth(req);
  if (deny) return deny;
  try {
    const sessions = await fetchSessions();
    return NextResponse.json(sessions);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
