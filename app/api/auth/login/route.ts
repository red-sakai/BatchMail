import { NextResponse } from 'next/server';
import crypto from 'crypto';

type LoginBody = { email?: string; password?: string };

export async function POST(req: Request) {
  let body: LoginBody = {};
  try { body = await req.json() as LoginBody; } catch {}
  const { email, password } = body || {} as LoginBody;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return NextResponse.json({ ok:false, error:'Admin credentials not configured' }, { status:500 });
  }
  if (!email || !password) {
    return NextResponse.json({ ok:false, error:'Missing email or password' }, { status:400 });
  }
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok:false, error:'Invalid credentials' }, { status:401 });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const res = NextResponse.json({ ok:true });
  res.cookies.set('batchmail_auth', token, { httpOnly: true, secure: true, path: '/', sameSite: 'lax', maxAge: 60 * 60 });
  return res;
}
