// app/api/challenges/[id]/checkin/route.ts
// UPDATED: Uses getAuth()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { updateChallengeProgress } from "@/lib/progressUtils";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (challenge.creatorId !== auth.userId && challenge.opponentId !== auth.userId) {
        return NextResponse.json({ error: "Only duel participants can check in" }, { status: 403 });
    }
    if (challenge.challengeMode !== "MULTI_DAY") {
        return NextResponse.json({ error: "Check-ins are only for multi-day challenges" }, { status: 400 });
    }
    if (challenge.status !== "ACTIVE") {
        return NextResponse.json({ error: "Challenge is not active" }, { status: 400 });
    }

    let note: string | undefined;
    try {
        const body = await req.json();
        note = body.note;
    } catch {
        // No body is fine
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const challengeStart = new Date(challenge.createdAt);
    challengeStart.setUTCHours(0, 0, 0, 0);
    const challengeEnd = new Date(challenge.deadline);
    challengeEnd.setUTCHours(23, 59, 59, 999);

    if (today < challengeStart || today > challengeEnd) {
        return NextResponse.json({ error: "Today is outside the challenge date range" }, { status: 400 });
    }

    const checkIn = await prisma.dailyCheckIn.upsert({
        where: {
            challengeId_date: { challengeId: id, date: today },
        },
        create: {
            challengeId: id,
            userId: auth.userId,
            date: today,
            note,
            source: "MANUAL",
        },
        update: {
            note,
        },
    });

    await updateChallengeProgress(id);

    return NextResponse.json(checkIn, { status: 201 });
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const checkIns = await prisma.dailyCheckIn.findMany({
        where: { challengeId: id },
        orderBy: { date: "asc" },
        select: {
            id: true,
            date: true,
            note: true,
            source: true,
            createdAt: true,
        },
    });

    return NextResponse.json(checkIns);
}