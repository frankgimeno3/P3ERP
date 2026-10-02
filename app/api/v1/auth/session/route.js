import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The middleware verifies the Cognito tokens and resolves the user's permissions.
export function GET() {
    return NextResponse.json({ authenticated: true }, { headers: { 'Cache-Control': 'no-store' } });
}
