import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for API requests
const ALLOWED_ORIGINS = [
  'https://67ranked.com',
  'https://www.67ranked.com',
  'https://67ranked.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

// API routes that need CORS protection
const PROTECTED_API_ROUTES = [
  '/api/submit',
  '/api/duel/submit',
  '/api/duel/create',
  '/api/session',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a protected API route
  const isProtectedRoute = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    // For preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Max-Age', '86400');
      }
      
      return response;
    }
    
    // For actual requests, validate origin
    if (request.method === 'POST') {
      // Check origin header
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        console.warn(`Blocked request from unauthorized origin: ${origin}`);
        return NextResponse.json(
          { error: 'Unauthorized origin' },
          { status: 403 }
        );
      }
      
      // If no origin header, check referer as fallback
      if (!origin && referer) {
        const refererOrigin = new URL(referer).origin;
        if (!ALLOWED_ORIGINS.includes(refererOrigin)) {
          console.warn(`Blocked request from unauthorized referer: ${referer}`);
          return NextResponse.json(
            { error: 'Unauthorized origin' },
            { status: 403 }
          );
        }
      }
      
      // If neither origin nor referer, block (likely a direct API call)
      if (!origin && !referer) {
        console.warn('Blocked request with no origin or referer');
        return NextResponse.json(
          { error: 'Origin required' },
          { status: 403 }
        );
      }
    }
    
    // Add CORS headers to the response
    const response = NextResponse.next();
    
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
