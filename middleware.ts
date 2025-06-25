import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

export default clerkMiddleware(async (auth, req) => {
  const hostname = req.headers.get('host') || 'localhost:3000';
  const subdomain = getSubdomain(hostname);
  const pathname = req.nextUrl.pathname;

  // Create response object to add headers
  const response = NextResponse.next();

  // Set Content Security Policy for real-time WebSocket connections
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const supabaseHostname = supabaseUrl
      .replace('https://', '')
      .replace('http://', '');
    response.headers.set(
      'Content-Security-Policy',
      `connect-src 'self' https://${supabaseHostname} wss://${supabaseHostname} https://*.supabase.co wss://*.supabase.co;`
    );
  }

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Handle localhost without subdomain - allow all access for development
  if (hostname.includes('localhost') && !subdomain) {
    return response;
  }

  // Handle subdomain access (both localhost and production)
  if (subdomain) {
    // Check if subdomain is allowed
    if (!ALLOWED_SUBDOMAINS.includes(subdomain)) {
      // Rewrite to not-found page for proper 404 handling
      return NextResponse.rewrite(new URL('/not-found', req.url));
    }

    // Valid subdomain - check authentication
    const authResult = await auth();
    const isAuthenticated = !!authResult.userId;

    // Define auth pages that don't require authentication
    const authPages = [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/reset-password',
    ];
    const isAuthPage = authPages.some((page) => pathname.startsWith(page));

    // If accessing auth pages
    if (isAuthPage) {
      // Redirect authenticated users away from sign-in/sign-up pages
      if (
        isAuthenticated &&
        (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))
      ) {
        return NextResponse.redirect(new URL('/tickets', req.url));
      }
      return response;
    }

    // If accessing tickets page
    if (pathname.startsWith('/tickets')) {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
      return response;
    }

    // If accessing test-integration page (for testing purposes)
    if (pathname.startsWith('/test-integration')) {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
      return response;
    }

    // If accessing simple-realtime-test page (for testing purposes)
    if (pathname.startsWith('/simple-realtime-test')) {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
      return response;
    }

    // For root subdomain access, redirect based on authentication
    if (pathname === '/') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/tickets', req.url));
      } else {
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
    }

    // For any other routes on valid subdomain, require authentication
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
