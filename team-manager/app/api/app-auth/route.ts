import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const appPw   = process.env.APP_PASSWORD;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!appPw) return NextResponse.json({ error: 'No app password configured' }, { status: 500 });
  if (password === adminPw) return NextResponse.json({ ok: true, isAdmin: true });
  if (password === appPw)   return NextResponse.json({ ok: true, isAdmin: false });
  return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
}
