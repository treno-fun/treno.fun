// lib/types.ts
// Types matching the backend API responses.
// These mirror prisma/schema.prisma but only include what the mobile app needs.

export type ChallengeStatus =
  | "INITIALIZED"
  | "ACTIVE"
  | "PENDING_RESOLUTION"
  | "COMPLETED"
  | "FAILED"
  | "RESOLVED"
  | "DISPUTED"
  | "CANCELLED";

export type GoalType =
  | "DISTANCE_KM"
  | "WEIGHT_LOSS_KG"
  | "WORKOUT_COUNT"
  | "CALORIES_BURNED"
  | "CUSTOM";

export type ChallengeMode = "SINGLE_DAY" | "MULTI_DAY";
export type BetSide = "CREATOR" | "OPPONENT";
export type WorkoutType =
  | "RUN" | "RIDE" | "SWIM" | "WALK" | "HIKE"
  | "WEIGHT_TRAINING" | "YOGA" | "CROSSFIT" | "SPORT" | "OTHER";

export interface User {
  id: string;
  name: string | null;
  walletAddress: string | null;
  stravaConnected?: boolean;
  createdAt?: string;
  _count?: {
    challengesCreated: number;
    challengesJoined: number;
    bets: number;
    workouts: number;
  };
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  challengeMode: ChallengeMode;
  goalType: GoalType;
  goalTarget: number;
  goalUnit: string;
  deadline: string;
  status: ChallengeStatus;
  creatorProgress: number;
  opponentProgress: number;
  inviteToken: string | null;
  contractChallengeId: string | null;
  txHash: string | null;
  createdAt: string;
  creatorId: string;
  opponentId: string | null;
  creator: Pick<User, "id" | "name" | "walletAddress">;
  opponent?: Pick<User, "id" | "name" | "walletAddress"> | null;
  _count: { bets: number; workouts: number };
  bets?: Bet[];
  workouts?: Workout[];
}

export interface Bet {
  id: string;
  amountSol: string;
  amountLamports: string;
  side: BetSide;
  status: string;
  txHash: string | null;
  userId: string;
  challengeId: string;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "walletAddress">;
  challenge?: Partial<Challenge>;
}

export interface Workout {
  id: string;
  name: string | null;
  workoutType: WorkoutType;
  source: string;
  startTime: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  challenge?: { id: string; title: string } | null;
}

export interface CheckIn {
  id: string;
  date: string;
  note: string | null;
  source: string;
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  DISTANCE_KM: "Distance (km)",
  WEIGHT_LOSS_KG: "Weight loss (kg)",
  WORKOUT_COUNT: "Workout count",
  CALORIES_BURNED: "Calories burned",
  CUSTOM: "Custom goal",
};

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  RUN: "Run",
  RIDE: "Ride",
  SWIM: "Swim",
  WALK: "Walk",
  HIKE: "Hike",
  WEIGHT_TRAINING: "Weight Training",
  YOGA: "Yoga",
  CROSSFIT: "CrossFit",
  SPORT: "Sport",
  OTHER: "Other",
};
