import { NextRequest, NextResponse } from 'next/server';

// Paths that do not require auth
const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
]);

function isPublicPath(pathname: string) {
  if (pathname === '/') return false; // gate root
  if (pathname.startsWith('/_next')) return true;
  for (const p of PUBLIC_PATHS) {
    if (pathname === p || pathname.startsWith(p + '/')) return true;
  }
  // Allow static assets in /public (served at root)
  if (/[.](png|jpg|jpeg|gif|svg|webp|ico|txt|json|xml|css|js|map)$/i.test(pathname)) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  const token = req.cookies.get('batchmail_auth')?.value;
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth/login|api/auth/logout).*)'],
};
