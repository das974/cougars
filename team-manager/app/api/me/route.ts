import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const isAuthenticated = req.cookies.get('app_auth')?.value === '1';
  const isAdmin         = req.cookies.get('admin_auth')?.value === '1';
  return NextResponse.json({ isAuthenticated, isAdmin });
}
