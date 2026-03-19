import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const appPw   = process.env.APP_PASSWORD;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!appPw) return NextResponse.json({ error: 'No app password configured' }, { status: 500 });

  const isAdmin = (password === adminPw);
  const isAuth  = isAdmin || (password === appPw);
  if (!isAuth) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });

  const res = NextResponse.json({ ok: true, isAdmin });
  // HttpOnly so JS cannot read or forge these cookies
  res.cookies.set('app_auth',   '1',          { httpOnly: true, sameSite: 'strict', path: '/' });
  res.cookies.set('admin_auth', isAdmin ? '1' : '', { httpOnly: true, sameSite: 'strict', path: '/' });
  return res;
}
