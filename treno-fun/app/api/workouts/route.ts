// app/api/workouts/route.ts
// UPDATED: Uses getAuth() instead of getServerSession()

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { updateChallengeProgress, autoLinkAndUpdateChallenges } from "@/lib/progressUtils";
import { z } from "zod";

const CreateWorkoutSchema = z.object({
  workoutType: z.enum([
    "RUN", "RIDE", "SWIM", "WALK", "HIKE",
    "WEIGHT_TRAINING", "YOGA", "CROSSFIT", "SPORT", "OTHER",
  ]),
  startTime: z.string().datetime(),
  durationSeconds: z.number().optional(),
  distanceMeters: z.number().optional(),
  caloriesBurned: z.number().optional(),
  weightKg: z.number().optional(),
  avgHeartRate: z.number().optional(),
  notes: z.string().optional(),
  challengeId: z.string().optional(),
  name: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

  const workouts = await prisma.workout.findMany({
    where: { userId: auth.userId },
    include: {
      challenge: { select: { id: true, title: true } },
    },
    orderBy: { startTime: "desc" },
    take: limit,
  });

  return NextResponse.json(workouts);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workout = await prisma.workout.create({
    data: {
      ...parsed.data,
      startTime: new Date(parsed.data.startTime),
      source: "MANUAL",
      userId: auth.userId,
    },
  });

  // Update challenge progress if linked to a specific challenge
  if (parsed.data.challengeId) {
    await updateChallengeProgress(parsed.data.challengeId);
  }

  // Also auto-link to any active challenges and recalculate
  await autoLinkAndUpdateChallenges(auth.userId);

  return NextResponse.json(workout, { status: 201 });
}