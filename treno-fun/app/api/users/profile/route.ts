// app/api/users/profile/route.ts
// UPDATED: Uses getAuth() instead of getServerSession()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  image: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      walletAddress: true,
      stravaConnected: true,
      stravaId: true,
      createdAt: true,
      _count: { select: { challengesCreated: true, challengesJoined: true, bets: true, workouts: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}