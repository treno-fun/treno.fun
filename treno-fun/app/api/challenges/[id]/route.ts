// app/api/challenges/[id]/route.ts
// UPDATED: Uses getAuth() instead of getServerSession()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { serializeBigInt } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, walletAddress: true } },
      bets: {
        include: { user: { select: { id: true, name: true, walletAddress: true } } },
        orderBy: { createdAt: "desc" },
      },
      workouts: {
        orderBy: { startTime: "desc" },
        take: 20,
      },
      _count: { select: { bets: true, workouts: true } },
    },
  });

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serializeBigInt(challenge));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.creatorId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.challenge.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(serializeBigInt(updated));
}