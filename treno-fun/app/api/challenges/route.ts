// app/api/challenges/route.ts
// UPDATED: Uses getAuth() instead of getServerSession() to support both web and mobile.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { serializeBigInt } from "@/lib/utils";
import { randomUUID } from "crypto";

const CreateChallengeSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().optional(),
  challengeMode: z.enum(["SINGLE_DAY", "MULTI_DAY"]).default("SINGLE_DAY"),
  goalType: z.enum(["DISTANCE_KM", "WEIGHT_LOSS_KG", "WORKOUT_COUNT", "CALORIES_BURNED", "CUSTOM"]),
  goalTarget: z.number().positive(),
  goalUnit: z.string(),
  deadline: z.string().datetime(),
  contractChallengeId: z.string().optional(),
  txHash: z.string().optional(),
  checkInSource: z.enum(["MANUAL", "STRAVA"]).default("MANUAL"),
});

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [
        { creatorId: auth.userId },
        { opponentId: auth.userId },
      ],
    },
    include: {
      creator: { select: { id: true, name: true, walletAddress: true } },
      opponent: { select: { id: true, name: true, walletAddress: true } },
      _count: { select: { bets: true, workouts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(serializeBigInt(challenges));
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const challenge = await prisma.challenge.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      challengeMode: parsed.data.challengeMode,
      goalType: parsed.data.goalType,
      goalTarget: parsed.data.goalTarget,
      goalUnit: parsed.data.goalUnit,
      deadline: new Date(parsed.data.deadline),
      contractChallengeId: parsed.data.contractChallengeId,
      txHash: parsed.data.txHash,
      inviteToken: randomUUID(),
      creatorId: auth.userId,
      checkInSource: parsed.data.checkInSource,
    },
  });

  return NextResponse.json(serializeBigInt(challenge), { status: 201 });
}