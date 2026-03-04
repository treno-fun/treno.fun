// app/api/strava/callback/route.ts
// UPDATED: Uses getAuth() — but note this route uses GET with a redirect flow,
// so it still needs session-based auth for the browser redirect.
// For mobile, Strava OAuth will be handled differently (deep links).

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { exchangeToken } from "@/lib/strava";

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");

    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

    // Try unified auth (JWT for mobile, session for web)
    const auth = await getAuth(req);
    if (!auth) {
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);
    }

    try {
        const data = await exchangeToken(code);

        await prisma.user.update({
            where: { id: auth.userId },
            data: {
                stravaId: String(data.athlete.id),
                stravaAccessToken: data.access_token,
                stravaRefreshToken: data.refresh_token,
                stravaTokenExpiry: new Date(data.expires_at * 1000),
                stravaConnected: true,
            },
        });

        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?strava=connected`);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Strava auth failed" }, { status: 500 });
    }
}