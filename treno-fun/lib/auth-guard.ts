// lib/auth-guard.ts
// Unified authentication helper for API routes.
//
// Checks two auth methods in order:
//   1. Authorization: Bearer <jwt>  (mobile app)
//   2. NextAuth session cookie      (web app)
//
// Usage in any API route:
//   const auth = await getAuth(req);
//   if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   // auth.userId and auth.walletAddress are available

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/jwt";

export interface AuthResult {
    userId: string;
    walletAddress: string | null;
}

/**
 * Authenticate a request from either the mobile app (JWT) or web app (NextAuth session).
 * Returns user info if authenticated, null otherwise.
 */
export async function getAuth(req?: NextRequest): Promise<AuthResult | null> {
    // ── 1. Check for Bearer token (mobile) ───────────────────
    if (req) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            const payload = verifyMobileToken(token);
            if (payload) {
                return {
                    userId: payload.userId,
                    walletAddress: payload.walletAddress,
                };
            }
            // If Bearer token is present but invalid, don't fall through to session.
            // This prevents confusion where a mobile request accidentally uses a web session.
            return null;
        }
    }

    // ── 2. Fall back to NextAuth session (web) ───────────────
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        return {
            userId: session.user.id,
            walletAddress: (session.user as any).walletAddress ?? null,
        };
    }

    return null;
}