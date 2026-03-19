import { NextRequest, NextResponse } from 'next/server';
import { checkAppAuth, checkAdminAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const isAuthenticated = await checkAppAuth(req);
  const isAdmin         = isAuthenticated && await checkAdminAuth(req);
  return NextResponse.json({ isAuthenticated, isAdmin });
}
