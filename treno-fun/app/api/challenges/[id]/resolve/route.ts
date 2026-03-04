// app/api/challenges/[id]/resolve/route.ts
// UPDATED: Uses getAuth()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { serializeBigInt } from "@/lib/utils";

const ResolveSchema = z.object({
  winner: z.enum(["CREATOR", "OPPONENT"]),
  note: z.string().optional(),
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
  if (challenge.creatorId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (challenge.status !== "ACTIVE") {
    return NextResponse.json({ error: "Challenge already resolved" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = ResolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolutionNote: parsed.data.note,
      txHash: parsed.data.txHash,
    },
  });

  return NextResponse.json(serializeBigInt(updated));
}