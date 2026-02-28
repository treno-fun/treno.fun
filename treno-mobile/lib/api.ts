// lib/api.ts
// Centralized API client for the mobile app.
// Automatically attaches JWT token from secure storage.

import { getToken, clearAuth } from "./auth";
import { API_URL } from "./constants";
import type { Challenge, Bet, Workout, User, CheckIn } from "./types";

// ── Core fetch wrapper ─────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const url = `${API_URL}${path}`;

  console.log(`[API] ${options.method || "GET"} ${path}`);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    // If unauthorized, clear auth so the app redirects to login
    if (res.status === 401) {
      console.log("[API] 401 — clearing auth");
      await clearAuth();
      throw new ApiError("Session expired. Please sign in again.", 401);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error || `Request failed (${res.status})`;
      console.error(`[API] Error ${res.status}:`, msg);
      throw new ApiError(msg, res.status);
    }

    const data = await res.json();
    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    // Network error
    console.error("[API] Network error:", err.message);
    throw new ApiError("Network error — check your connection", 0);
  }
}

// ── Auth ────────────────────────────────────────────────

export async function getProfile(): Promise<User> {
  return apiFetch("/api/users/profile");
}

// ── Challenges ──────────────────────────────────────────

export async function getChallenges(): Promise<Challenge[]> {
  return apiFetch("/api/challenges");
}

export async function getChallenge(id: string): Promise<Challenge> {
  return apiFetch(`/api/challenges/${id}`);
}

export async function createChallenge(data: {
  title: string;
  description?: string;
  challengeMode: string;
  goalType: string;
  goalTarget: number;
  goalUnit: string;
  deadline: string;
  checkInSource?: string;
  contractChallengeId?: string;
  txHash?: string;
}): Promise<Challenge> {
  return apiFetch("/api/challenges", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function joinChallenge(
  id: string,
  txHash: string
): Promise<Challenge> {
  return apiFetch(`/api/challenges/${id}/join`, {
    method: "POST",
    body: JSON.stringify({ txHash }),
  });
}

export async function registerChallengeOnChain(
  id: string,
  contractChallengeId: string,
  txHash: string
): Promise<Challenge> {
  return apiFetch(`/api/challenges/${id}/register`, {
    method: "PATCH",
    body: JSON.stringify({ contractChallengeId, txHash }),
  });
}

export async function resolveChallenge(
  id: string,
  winner: "CREATOR" | "OPPONENT",
  txHash?: string
): Promise<Challenge> {
  return apiFetch(`/api/challenges/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ winner, txHash }),
  });
}

// ── Check-ins ───────────────────────────────────────────

export async function checkIn(
  challengeId: string,
  note?: string
): Promise<CheckIn> {
  return apiFetch(`/api/challenges/${challengeId}/checkin`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function getCheckIns(challengeId: string): Promise<CheckIn[]> {
  return apiFetch(`/api/challenges/${challengeId}/checkin`);
}

// ── Bets ────────────────────────────────────────────────

export async function placeBet(data: {
  challengeId: string;
  side: string;
  amountSol: string;
  amountLamports: string;
  txHash: string;
  inviteToken: string;
}): Promise<Bet> {
  return apiFetch("/api/bets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBets(challengeId?: string): Promise<Bet[]> {
  const query = challengeId ? `?challengeId=${challengeId}` : "";
  return apiFetch(`/api/bets${query}`);
}

// ── Workouts ────────────────────────────────────────────

export async function getWorkouts(limit = 20): Promise<Workout[]> {
  return apiFetch(`/api/workouts?limit=${limit}`);
}

export async function logWorkout(data: {
  workoutType: string;
  startTime: string;
  durationSeconds?: number;
  distanceMeters?: number;
  caloriesBurned?: number;
  weightKg?: number;
  notes?: string;
  challengeId?: string;
}): Promise<Workout> {
  return apiFetch("/api/workouts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Strava ──────────────────────────────────────────────

export async function syncStrava(): Promise<{ synced: number }> {
  return apiFetch("/api/strava/sync", { method: "POST" });
}