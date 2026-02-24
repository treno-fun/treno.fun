// lib/progressUtils.ts
// Shared utility for calculating challenge progress and auto-linking workouts

import { prisma } from '@/lib/db'
import { WorkoutSource } from '@prisma/client'

// ... existing code ...

export async function updateChallengeProgress(challengeId: string) {
    const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        include: { workouts: true, checkIns: true },
    });
    if (!challenge) return;

    // Separate workouts by user
    const creatorWorkouts = challenge.workouts.filter(w => w.userId === challenge.creatorId);
    const opponentWorkouts = challenge.workouts.filter(w => w.userId === challenge.opponentId);

    let creatorProgress = 0;
    let opponentProgress = 0;

    // Helper to calculate progress based on goal type
    const calculateProgress = (workouts: any[], goalType: string) => {
        switch (goalType) {
            case 'DISTANCE_KM':
                return workouts.reduce((sum, w) => sum + (w.distanceMeters ?? 0) / 1000, 0);
            case 'WORKOUT_COUNT':
                return workouts.length;
            case 'CALORIES_BURNED':
                return workouts.reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0);
            case 'WEIGHT_LOSS_KG': {
                const weights = workouts
                    .filter((w) => w.weightKg !== null)
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                if (weights.length >= 2) {
                    return (weights[0].weightKg ?? 0) - (weights[weights.length - 1].weightKg ?? 0);
                }
                return 0;
            }
            default:
                return workouts.length;
        }
    };

    if (challenge.challengeMode === 'MULTI_DAY') {
        creatorProgress = challenge.checkIns.filter(c => c.userId === challenge.creatorId).length;
        opponentProgress = challenge.checkIns.filter(c => c.userId === challenge.opponentId).length;
    } else {
        creatorProgress = calculateProgress(creatorWorkouts, challenge.goalType);
        opponentProgress = calculateProgress(opponentWorkouts, challenge.goalType);
    }

    await prisma.challenge.update({
        where: { id: challengeId },
        data: { 
            creatorProgress: Math.max(0, creatorProgress),
            opponentProgress: Math.max(0, opponentProgress),
        },
    });
}

/**
 * Auto-link unlinked workouts to the user's ACTIVE challenges,
 * then recalculate progress for each affected challenge.
 * Also auto-creates check-ins for MULTI_DAY challenges when
 * a workout exists on a day within the challenge date range.
 */
export async function autoLinkAndUpdateChallenges(userId: string) {
    // 1. Find user's active challenges
    const activeChallenges = await prisma.challenge.findMany({
        where: {
            creatorId: userId,
            status: 'ACTIVE',
        },
        select: {
            id: true,
            createdAt: true,
            deadline: true,
            goalType: true,
            challengeMode: true,
        },
    })

    if (activeChallenges.length === 0) return

    // 2. Find all unlinked workouts for this user
    const unlinkedWorkouts = await prisma.workout.findMany({
        where: {
            userId,
            challengeId: null,
        },
        select: {
            id: true,
            startTime: true,
            source: true,
        },
    })

    // 3. For each active challenge, link matching unlinked workouts
    for (const challenge of activeChallenges) {
        const matchingWorkouts = unlinkedWorkouts.filter((w) => {
            const t = w.startTime.getTime()
            return t >= challenge.createdAt.getTime() && t <= challenge.deadline.getTime()
        })

        // Link workouts to single-day challenges
        if (challenge.challengeMode === 'SINGLE_DAY' && matchingWorkouts.length > 0) {
            await prisma.workout.updateMany({
                where: { id: { in: matchingWorkouts.map((w) => w.id) } },
                data: { challengeId: challenge.id },
            })
        }

        // Auto-create check-ins for multi-day challenges
        if (challenge.challengeMode === 'MULTI_DAY') {
            // Get unique workout dates
            const workoutDates = new Set<string>()
            for (const w of [...matchingWorkouts, ...unlinkedWorkouts.filter((w) => {
                const t = w.startTime.getTime()
                return t >= challenge.createdAt.getTime() && t <= challenge.deadline.getTime()
            })]) {
                const d = new Date(w.startTime)
                d.setUTCHours(0, 0, 0, 0)
                workoutDates.add(d.toISOString())
            }

            // Upsert check-ins for each unique workout date
            for (const dateStr of workoutDates) {
                const date = new Date(dateStr)
                try {
                    await prisma.dailyCheckIn.upsert({
                        where: {
                            challengeId_date: { challengeId: challenge.id, date },
                        },
                        create: {
                            challengeId: challenge.id,
                            userId,
                            date,
                            source: WorkoutSource.STRAVA,
                        },
                        update: {}, // Don't overwrite manual check-ins
                    })
                } catch {
                    // Ignore unique constraint errors
                }
            }
        }

        // Recalculate progress
        await updateChallengeProgress(challenge.id)
    }
}
