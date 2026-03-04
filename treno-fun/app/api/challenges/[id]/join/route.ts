// app/api/challenges/[id]/join/route.ts
// UPDATED: Uses getAuth()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { txHash } = await req.json();

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.creatorId === auth.userId) {
    return NextResponse.json({ error: "Cannot duel yourself" }, { status: 400 });
  }

  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      opponentId: auth.userId,
      status: "ACTIVE",
    },
  });

  return NextResponse.json(updated);
}