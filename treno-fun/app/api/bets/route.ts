// app/api/bets/route.ts
// UPDATED: Uses getAuth() instead of getServerSession()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { serializeBigInt } from "@/lib/utils";

const PlaceBetSchema = z.object({
  challengeId: z.string(),
  side: z.enum(["CREATOR", "OPPONENT"]),
  amountSol: z.string(),
  amountLamports: z.string(),
  txHash: z.string(),
  inviteToken: z.string(),
});

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = PlaceBetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: parsed.data.challengeId },
  });
  if (!challenge || (challenge.status !== "ACTIVE" && challenge.status !== "INITIALIZED")) {
    return NextResponse.json({ error: "Challenge not bettable" }, { status: 400 });
  }
  if (challenge.creatorId === auth.userId) {
    return NextResponse.json({ error: "Cannot bet on your own challenge" }, { status: 400 });
  }
  if (!challenge.inviteToken || challenge.inviteToken !== parsed.data.inviteToken) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 403 });
  }

  const bet = await prisma.bet.create({
    data: {
      amountSol: parsed.data.amountSol,
      amountLamports: parsed.data.amountLamports,
      side: parsed.data.side,
      status: "CONFIRMED",
      txHash: parsed.data.txHash,
      userId: auth.userId,
      challengeId: parsed.data.challengeId,
    },
  });

  if (challenge.status === "INITIALIZED") {
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { status: "ACTIVE" },
    });
  }

  return NextResponse.json(serializeBigInt(bet), { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId");

  const bets = await prisma.bet.findMany({
    where: challengeId
      ? { challengeId }
      : { userId: auth.userId },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          status: true,
          deadline: true,
          goalTarget: true,
          goalUnit: true,
          creatorProgress: true,
          opponentProgress: true,
        },
      },
      user: { select: { id: true, name: true, walletAddress: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(serializeBigInt(bets));
}