import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok:true });
  res.cookies.set('batchmail_auth', '', { httpOnly: true, secure: true, path: '/', maxAge: 0 });
  return res;
}
