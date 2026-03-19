import { NextRequest, NextResponse } from 'next/server';

const enc = new TextEncoder();

async function hmacSign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return Buffer.from(sig).toString('hex');
}

async function hmacVerify(value: string, sigHex: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    return crypto.subtle.verify('HMAC', key, Buffer.from(sigHex, 'hex'), enc.encode(value));
  } catch {
    return false;
  }
}

async function verifyCookie(raw: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!raw || !secret) return false;
  const dot = raw.lastIndexOf('.');
  if (dot === -1) return false;
  return hmacVerify(raw.slice(0, dot), raw.slice(dot + 1), secret);
}

// ── Cookie factories (used by auth routes when setting cookies) ─────────────
export async function makeAppCookie(): Promise<string> {
  const secret = process.env.APP_PASSWORD;
  if (!secret) throw new Error('APP_PASSWORD is not set');
  return `1.${await hmacSign('1', secret)}`;
}

export async function makeAdminCookie(): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('ADMIN_PASSWORD is not set');
  return `1.${await hmacSign('1', secret)}`;
}

// ── Boolean checks (used where a 401/403 response isn't appropriate) ────────
export async function checkAppAuth(req: NextRequest): Promise<boolean> {
  return verifyCookie(req.cookies.get('app_auth')?.value, process.env.APP_PASSWORD);
}

export async function checkAdminAuth(req: NextRequest): Promise<boolean> {
  return verifyCookie(req.cookies.get('admin_auth')?.value, process.env.ADMIN_PASSWORD);
}

// ── Guards (used in data routes — return a response on failure) ─────────────
export async function requireAppAuth(req: NextRequest): Promise<NextResponse | null> {
  return (await checkAppAuth(req)) ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function requireAdminAuth(req: NextRequest): Promise<NextResponse | null> {
  return (await checkAdminAuth(req)) ? null : NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
