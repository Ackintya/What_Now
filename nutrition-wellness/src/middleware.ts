import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (token) {
    // Clone URL to remove the token so it doesn't stay visible in the address bar
    const url = request.nextUrl.clone();
    url.searchParams.delete('token');
    
    const response = NextResponse.redirect(url);
    
    // Add the token to cookies so the user is instantly logged in
    response.cookies.set('auth_token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
