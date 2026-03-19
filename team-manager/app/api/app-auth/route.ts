import { NextRequest, NextResponse } from 'next/server';
import { makeAppCookie, makeAdminCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const appPw   = process.env.APP_PASSWORD;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!appPw) return NextResponse.json({ error: 'No app password configured' }, { status: 500 });

  const isAdmin = (password === adminPw);
  const isAuth  = isAdmin || (password === appPw);
  if (!isAuth) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });

  const res = NextResponse.json({ ok: true, isAdmin });
  res.cookies.set('app_auth', await makeAppCookie(), { httpOnly: true, sameSite: 'strict', path: '/' });
  if (isAdmin) {
    res.cookies.set('admin_auth', await makeAdminCookie(), { httpOnly: true, sameSite: 'strict', path: '/' });
  } else {
    // Clear any stale admin cookie in case they previously had admin access
    res.cookies.set('admin_auth', '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  }
  return res;
}
