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
  if (pathname === '/') return false; // gate root page
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api/')) return true; // don't redirect API calls from middleware
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

  // Only redirect for HTML page navigations
  const accept = req.headers.get('accept') || '';
  const isHtml = accept.includes('text/html') || (!/[.][a-zA-Z0-9]+$/.test(pathname) && !pathname.startsWith('/api/'));
  if (!isHtml) return NextResponse.next();

  const token = req.cookies.get('batchmail_auth')?.value;
  // If user hits /login while already authenticated, bounce to target or home
  if (pathname === '/login' && token) {
    const url = new URL('/', req.url);
    const dest = req.nextUrl.searchParams.get('redirect');
    if (dest) url.pathname = dest;
    return NextResponse.redirect(url);
  }
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
