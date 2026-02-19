// app/api/auth/mobile/route.ts
// Standalone mobile auth endpoint — NOT handled by NextAuth.
// Verifies a Solana wallet signature and returns a JWT for the mobile app.

import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { prisma } from "@/lib/db";
import { signMobileToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
    try {
        const { address, message, signature } = await req.json();

        if (!address || !message || !signature) {
            return NextResponse.json(
                { error: "Missing address, message, or signature" },
                { status: 400 }
            );
        }

        // Verify the signature
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(address);

        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );

        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        // Upsert the user
        const user = await prisma.user.upsert({
            where: { walletAddress: address },
            update: {},
            create: {
                walletAddress: address,
                name: `${address.slice(0, 4)}...${address.slice(-4)}`,
            },
        });

        // Sign a JWT for the mobile client
        const token = signMobileToken({
            userId: user.id,
            walletAddress: user.walletAddress!,
        });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                walletAddress: user.walletAddress,
            },
        });
    } catch (err: any) {
        console.error("[mobile-auth] Error:", err);
        return NextResponse.json(
            { error: "Authentication failed" },
            { status: 500 }
        );
    }
}
