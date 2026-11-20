import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    if (
        pathname.startsWith('/lockdown') || 
        // Only the sign-in endpoints are public. Registering keys and the
        // rest of /api/auth need a session like any other page.
        pathname === '/api/auth/totp' ||
        pathname === '/api/auth/webauthn/generate-authentication-options' ||
        pathname === '/api/auth/webauthn/verify-authentication' ||
        pathname.startsWith('/api/telemetry') || // Allow external telemetry
        pathname.startsWith('/api/cron') ||      // Vercel Cron; the route checks CRON_SECRET itself
        pathname === '/api/widget/summary' ||    // Frost cards; the route checks WIDGET_TOKEN itself
        pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico')
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get('fortis_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/lockdown', request.url));
    }

    const payload = await verifyToken(token);
    
    if (!payload) {
        const response = NextResponse.redirect(new URL('/lockdown', request.url));
        response.cookies.delete('fortis_token');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
