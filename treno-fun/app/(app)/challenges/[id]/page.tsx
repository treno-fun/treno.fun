import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { GoalProgressBar } from "@/components/fitness/GoalProgressBar";
import { Badge } from "@/components/ui/badge";
import { BetPoolDisplay } from "@/components/betting/BetPoolDisplay";
import { ChallengeActions } from "./ChallengeActions";
import { WorkoutCard } from "@/components/fitness/WorkoutCard";
import { CheckInCalendar } from "@/components/challenges/CheckInCalendar";
import { BettorsList } from "@/components/challenges/BettorsList";
import { GOAL_TYPE_LABELS } from "@/types";
import { shortenAddress } from "@/lib/utils";
import { ArrowLeft, Calendar, User, CalendarDays } from "lucide-react";
import Link from "next/link";
import type { ChallengeStatus } from "@prisma/client";
import { PageFadeIn, GlassSection } from "@/components/ui/animated-wrappers";

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

export default async function ChallengeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { invite } = await searchParams;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, walletAddress: true } },
      opponent: { select: { id: true, name: true, walletAddress: true } }, // NEW
      bets: {
        include: { user: { select: { id: true, name: true, walletAddress: true } } },
        orderBy: { createdAt: "desc" },
      },
      workouts: { orderBy: { startTime: "desc" }, take: 10 },
      _count: { select: { bets: true } },
    },
  });

  if (!challenge) notFound();

  // 1v1 Duel Logic variables
  const isOwner = challenge.creatorId === session.user.id;
  const isOpponent = challenge.opponentId === session.user.id;
  const hasOpponent = !!challenge.opponentId;
  
  const userBet = challenge.bets.find((b) => b.userId === session.user.id);
  const pastDeadline = new Date(challenge.deadline) < new Date();
  const hasValidInvite = invite === challenge.inviteToken;
  const isMultiDay = challenge.challengeMode === "MULTI_DAY";

  // Calculate Lamport pools
  const totalCreator = challenge.bets
    .filter((b) => b.side === "CREATOR")
    .reduce((sum, b) => sum + BigInt(b.amountLamports), BigInt(0));
  const totalOpponent = challenge.bets
    .filter((b) => b.side === "OPPONENT")
    .reduce((sum, b) => sum + BigInt(b.amountLamports), BigInt(0));

  return (
    <PageFadeIn>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Link href="/challenges" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors w-fit">
          <ArrowLeft size={16} />
          Challenges
        </Link>

        {/* Header */}
        <GlassSection className="p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF87]/30 to-transparent" />
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">{challenge.title}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <User size={13} />
                  {challenge.creator.name ?? shortenAddress(challenge.creator.walletAddress ?? "")}
                  {isOwner && " (you)"}
                  {hasOpponent && (
                    <>
                      <span className="mx-1 text-zinc-600">vs</span>
                      {challenge.opponent?.name ?? shortenAddress(challenge.opponent?.walletAddress ?? "")}
                      {isOpponent && " (you)"}
                    </>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  Due {new Date(challenge.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={statusVariant[challenge.status]}>
                {challenge.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
{/* Replace the old <GoalProgressBar /> with this: */}
{!isMultiDay && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
    {/* Creator Progress */}
    <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
      <h3 className="text-sm font-medium text-[#00FF87] mb-3">
        {challenge.creator.name || "Creator"}'s Progress
      </h3>
      <GoalProgressBar
        current={challenge.creatorProgress}
        target={challenge.goalTarget}
        unit={challenge.goalUnit}
        deadline={new Date(challenge.deadline)}
      />
    </div>

    {/* Opponent Progress */}
    <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
      <h3 className="text-sm font-medium text-purple-400 mb-3">
        {challenge.opponent?.name || "Waiting for opponent..."}'s Progress
      </h3>
      <GoalProgressBar
        current={challenge.opponentProgress}
        target={challenge.goalTarget}
        unit={challenge.goalUnit}
        deadline={new Date(challenge.deadline)}
      />
    </div>
  </div>
)}
        </GlassSection>

        {/* Bet Pool */}
        <GlassSection className="p-6">
          <h2 className="text-white font-semibold mb-4">Duel Prize Pool</h2>
          <BetPoolDisplay
            totalCreator={totalCreator.toString()}
            totalOpponent={totalOpponent.toString()}
            betCount={challenge._count.bets}
          />
          {userBet && (
            <div className="mt-4 bg-white/[0.03] rounded-xl px-4 py-3 text-sm border border-white/[0.04]">
              <span className="text-zinc-400">Your bet: </span>
              <span className={userBet.side === "CREATOR" ? "text-[#00FF87] font-medium" : "text-purple-400 font-medium"}>
                {userBet.amountSol} SOL on {userBet.side}
              </span>
            </div>
          )}
        </GlassSection>

        {/* Actions */}
        <ChallengeActions
          challengeId={id}
          contractChallengeId={challenge.contractChallengeId}
          challengeTitle={challenge.title}
          isOwner={isOwner}
          isOpponent={isOpponent}
          hasOpponent={hasOpponent}
          status={challenge.status}
          pastDeadline={pastDeadline}
          hasExistingBet={!!userBet}
          deadline={challenge.deadline}
          inviteToken={isOwner || isOpponent ? challenge.inviteToken : (hasValidInvite ? invite : null)}
          userBetSide={userBet?.side}
        />

        {/* On-Chain Participants List (Replaced useReadContract logic) */}
        <BettorsList bets={challenge.bets} />
      </div>
    </PageFadeIn>
  );
}