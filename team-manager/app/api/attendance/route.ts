import { NextRequest, NextResponse } from 'next/server';
import { setAttendance } from '@/lib/airtable';
import { requireAppAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const deny = await requireAppAuth(req);
  if (deny) return deny;
  try {
    const body = await req.json();
    const { sessionId, attendingIds } = body;

    if (!sessionId || !Array.isArray(attendingIds)) {
      return NextResponse.json({ error: 'sessionId and attendingIds[] are required' }, { status: 400 });
    }

    const confirmed = await setAttendance(sessionId, attendingIds);
    return NextResponse.json({ attendingIds: confirmed });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
