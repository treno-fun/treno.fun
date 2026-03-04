// app/api/challenges/[id]/finalize/route.ts
// UPDATED: Uses getAuth()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { serializeBigInt } from "@/lib/utils";

const FinalizeSchema = z.object({
    txHash: z.string().optional(),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const challenge = await prisma.challenge.findUnique({ where: { id } });

    if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (challenge.status !== "PENDING_RESOLUTION") {
        return NextResponse.json({ error: "Challenge is not pending resolution" }, { status: 400 });
    }

    if (challenge.disputeDeadline && new Date(challenge.disputeDeadline) > new Date()) {
        return NextResponse.json({ error: "Dispute window is still open" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = FinalizeSchema.safeParse(body);

    const updated = await prisma.challenge.update({
        where: { id },
        data: {
            status: challenge.resolvedSuccess ? "COMPLETED" : "FAILED",
            ...(parsed.success && parsed.data.txHash ? { txHash: parsed.data.txHash } : {}),
        },
    });

    return NextResponse.json(serializeBigInt(updated));
}