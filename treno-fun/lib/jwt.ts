// lib/jwt.ts
// JWT utilities for mobile authentication
// Web app continues to use NextAuth sessions — this is only for mobile clients.

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

export interface JwtPayload {
    userId: string;
    walletAddress: string;
    iat?: number;
    exp?: number;
}

/**
 * Sign a JWT for a mobile client after wallet signature verification.
 */
export function signMobileToken(payload: {
    userId: string;
    walletAddress: string;
}): string {
    return jwt.sign(
        { userId: payload.userId, walletAddress: payload.walletAddress },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
    );
}

/**
 * Verify a JWT from the Authorization header.
 * Returns the payload if valid, null if invalid/expired.
 */
export function verifyMobileToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch {
        return null;
    }
}