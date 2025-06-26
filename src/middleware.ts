import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

// Define allowed subdomains (organization slugs)
const ALLOWED_SUBDOMAINS = ['quantumnest'];

// Extract subdomain from hostname
function getSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');

  // For localhost subdomains like "quantumnest.localhost:3000"
  if (hostname.includes('localhost') && parts.length >= 2) {
    return parts[0] !== 'localhost' ? parts[0] || null : null;
  }

  // For production domains like "quantumnest.example.com"
  if (parts.length >= 3 && parts[0]) {
    return parts[0];
  }

  return null;
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const hostname = req.headers.get('host') || 'localhost:3000';
  const subdomain = getSubdomain(hostname);
  const pathname = req.nextUrl.pathname;
  const response = NextResponse.next();

  // Generate CSP directives matching enterprise-grade security
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseHost = new URL(supabaseUrl).hostname;
  const nonce = crypto.randomUUID();

  const csp = [
    "default-src 'self'",
    `script-src 'self' https://clerk.catalystrcm.com https://*.clerk.accounts.dev https://${supabaseHost} 'unsafe-inline' ${
      process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''
    }`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://clerk.catalystrcm.com https://*.clerk.accounts.dev https://${supabaseHost} wss://${supabaseHost} https://*.supabase.co wss://*.supabase.co https://clerk-telemetry.com${
      process.env.NODE_ENV === 'development'
        ? ' http://localhost:* ws://localhost:*'
        : ''
    }`,
    "frame-src 'self' https://clerk.catalystrcm.com https://*.clerk.accounts.dev",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'block-all-mixed-content',
    'upgrade-insecure-requests',
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Nonce', nonce);

  // Skip static files only
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return response;
  }

  // Localhost dev (no subdomain)
  if (hostname.includes('localhost') && !subdomain) {
    return response;
  }

  // Subdomain flows
  if (subdomain) {
    if (!ALLOWED_SUBDOMAINS.includes(subdomain)) {
      return NextResponse.rewrite(new URL('/not-found', req.url));
    }

    // For API routes that don't need auth checks, just return the response
    if (
      pathname.startsWith('/api/tickets') ||
      pathname.startsWith('/api/webhooks')
    ) {
      return response;
    }

    const { userId } = await auth();
    const isAuth = Boolean(userId);
    const authPages = [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/reset-password',
    ];
    const isAuthPage = authPages.some((p) => pathname.startsWith(p));

    if (isAuthPage) {
      if (
        isAuth &&
        ['/sign-in', '/sign-up'].some((p) => pathname.startsWith(p))
      ) {
        return NextResponse.redirect(new URL('/tickets', req.url));
      }
      return response;
    }

    if (
      ['/tickets', '/test-integration', '/simple-realtime-test'].some((p) =>
        pathname.startsWith(p)
      )
    ) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
      return response;
    }

    if (pathname === '/') {
      return isAuth
        ? NextResponse.redirect(new URL('/tickets', req.url))
        : NextResponse.redirect(new URL('/sign-in', req.url));
    }

    if (!isAuth) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
