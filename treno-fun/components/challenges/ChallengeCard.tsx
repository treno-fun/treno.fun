"use client";

import Link from "next/link";
import { GoalProgressBar } from "@/components/fitness/GoalProgressBar";
import { Badge } from "@/components/ui/badge";
import { MagicCard } from "@/components/ui/magic-card";
import { GOAL_TYPE_LABELS } from "@/types";
import type { ChallengeStatus, GoalType } from "@prisma/client";
import { Users, Clock, CalendarDays } from "lucide-react";

interface ChallengeCardProps {
  id: string;
  title: string;
  goalType: GoalType;
  goalTarget: number;
  goalUnit: string;
  creatorProgress: number;
  opponentProgress: number;
  deadline: Date;
  status: ChallengeStatus;
  betCount: number;
  creatorName?: string | null;
  opponentName?: string | null;
  isOwn?: boolean;
  challengeMode?: string;
}

const statusVariant: Record<ChallengeStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  INITIALIZED: "default",
  ACTIVE: "success",
  PENDING_RESOLUTION: "warning",
  COMPLETED: "info",
  FAILED: "danger",
  RESOLVED: "success",
  DISPUTED: "warning",
  CANCELLED: "default",
};

export function ChallengeCard({
  id,
  title,
  goalType,
  goalTarget,
  goalUnit,
  creatorProgress,
  opponentProgress,
  deadline,
  status,
  betCount,
  creatorName,
  opponentName,
  isOwn,
  challengeMode,
}: ChallengeCardProps) {
  const isMultiDay = challengeMode === "MULTI_DAY";
  const daysRemaining = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));

  return (
    <Link href={`/challenges/${id}`}>
      <MagicCard className="p-5 cursor-pointer group">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-base leading-snug truncate group-hover:text-[#00FF87] transition-colors">
              {title}
            </h3>
            <p className="text-zinc-500 text-xs mt-1">
              {GOAL_TYPE_LABELS[goalType]}
              <span className="block mt-1 text-zinc-300 font-medium">
                {creatorName || "Creator"} <span className="text-purple-400 text-[10px]">VS</span> {opponentName || "Waiting for opponent..."}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant={statusVariant[status]}>
              {status.replace("_", " ")}
            </Badge>
            {isMultiDay && (
              <Badge variant="info">
                <CalendarDays size={10} className="mr-0.5" />
                Multi-Day
              </Badge>
            )}
          </div>
        </div>

        {!isMultiDay && (
          <div className="space-y-3 mt-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">{creatorName || "Creator"}</span>
                <span className="text-[#00FF87]">{creatorProgress.toFixed(1)} / {goalTarget}</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-[#00FF87] rounded-full" style={{ width: `${Math.min((creatorProgress / goalTarget) * 100, 100)}%` }} />
              </div>
            </div>

            {opponentName && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">{opponentName}</span>
                  <span className="text-purple-400">{opponentProgress.toFixed(1)} / {goalTarget}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((opponentProgress / goalTarget) * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
          {isOwn && betCount > 0 && (
            <span className="flex items-center gap-1">
              <Users size={12} className="text-[#00FF87]/60" />
              <span className="text-zinc-400">{betCount} bet{betCount !== 1 ? "s" : ""}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {daysRemaining > 0 ? `${daysRemaining}d left` : "Ended"}
          </span>
        </div>
      </MagicCard>
    </Link>
  );
}
