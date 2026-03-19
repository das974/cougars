import { NextRequest, NextResponse } from 'next/server';
import { makeAdminCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.ADMIN_PASSWORD;
  if (!correct) return NextResponse.json({ error: 'No admin password configured' }, { status: 500 });
  if (password !== correct) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_auth', await makeAdminCookie(), { httpOnly: true, sameSite: 'strict', path: '/' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_auth', '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return res;
}
