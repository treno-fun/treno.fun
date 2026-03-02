"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "@/lib/anchor"; // Make sure this exports your Anchor program

import { PlaceBetDialog } from "@/components/betting/PlaceBetDialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { ChallengeStatus } from "@prisma/client";
import { CheckCircle, XCircle, TrendingUp, Link2, Copy, Check, Lock, Swords } from "lucide-react";

interface ChallengeActionsProps {
  challengeId: string;
  contractChallengeId: string | null;
  challengeTitle: string;
  isOwner: boolean;
  isOpponent?: boolean; // NEW: True if the current user accepted the duel
  hasOpponent?: boolean; // NEW: True if someone has already joined
  status: ChallengeStatus; // "INITIALIZED" (Waiting) | "ACTIVE" | "RESOLVED" etc.
  pastDeadline: boolean;
  hasExistingBet: boolean;
  deadline: Date;
  inviteToken?: string | null;
  userBetSide?: "CREATOR" | "OPPONENT" | null; // UPDATED to new Enum
}

export function ChallengeActions({
  challengeId,
  contractChallengeId,
  challengeTitle,
  isOwner,
  isOpponent = false,
  hasOpponent = false,
  status,
  pastDeadline,
  hasExistingBet,
  deadline,
  inviteToken,
  userBetSide,
}: ChallengeActionsProps) {
  const router = useRouter();

  // Local state
  const [betOpen, setBetOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Solana hooks
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  // Helper to get Anchor Program
  const getAnchorProgram = () => {
    if (!wallet) throw new Error("Wallet not connected");
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return getProgram(provider);
  };

  // 1. Copy Invite Link
  async function handleCopyInviteLink() {
    if (!inviteToken) return;
    const url = `${window.location.origin}/challenges/${challengeId}?invite=${inviteToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 2. Register Challenge On-Chain (Fallback if created without wallet)
  async function handleRegisterOnChain() {
    if (!wallet) return alert("Please connect your Solana wallet.");
    setRegistering(true);
    try {
      const program = getAnchorProgram();
      const challengeIdStr = challengeId; // Use DB ID as the on-chain ID string
      const [challengePda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("challenge"),
          new TextEncoder().encode(challengeIdStr)
        ],
        program.programId
      );

      const deadlineUnix = new BN(Math.floor(deadline.getTime() / 1000));
      const goalIdBytes = Array.from(crypto.getRandomValues(new Uint8Array(32))); // Dummy goal ID bytes
      const stakeAmount = new BN(0.02 * LAMPORTS_PER_SOL);

      const txHash = await program.methods
        .initializeChallenge(challengeIdStr, goalIdBytes, stakeAmount, deadlineUnix)
        .accounts({
          challenge: challengePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Save to DB
      const res = await fetch(`/api/challenges/${challengeId}/register`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractChallengeId: challengeIdStr, txHash }),
      });
      if (!res.ok) throw new Error("Failed to save registration in DB");

      router.refresh();
    } catch (err: any) {
      alert("Failed to register on-chain: " + (err?.message ?? "unknown error"));
    } finally {
      setRegistering(false);
    }
  }

  // 3. Join Challenge (Opponent accepts duel)
  async function handleJoinDuel() {
    if (!wallet || !contractChallengeId) return alert("Wallet not connected or challenge not registered.");
    setJoining(true);
    try {
      const program = getAnchorProgram();
      const [challengePda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("challenge"),
          new TextEncoder().encode(contractChallengeId)
        ],
        program.programId
      );

      const txHash = await program.methods
        .joinChallenge()
        .accounts({
          challenge: challengePda,
          opponent: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Notify backend that user joined
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash }),
      });
      if (!res.ok) throw new Error("Failed to update database.");

      router.refresh();
    } catch (err: any) {
      alert("Failed to join duel: " + (err?.message ?? "unknown error"));
    } finally {
      setJoining(false);
    }
  }

  // 4. Resolve Challenge (Creator calls this)
  async function handleResolve(winner: "CREATOR" | "OPPONENT") {
    if (!wallet || !contractChallengeId) return;
    setResolving(true);
    try {
      const program = getAnchorProgram();
      const [challengePda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("challenge"),
          new TextEncoder().encode(contractChallengeId)
        ],
        program.programId
      );

      // Pass the winner enum based on selection
      const winnerArg = winner === "CREATOR" ? { creator: {} } : { opponent: {} };

      const txHash = await program.methods
        .resolveChallenge(winnerArg as any)
        .accounts({
          challenge: challengePda,
          creator: wallet.publicKey, // Must be creator
        })
        .rpc();

      // Update DB
      const res = await fetch(`/api/challenges/${challengeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner, txHash }),
      });
      if (!res.ok) throw new Error("Failed to resolve in database");

      window.location.reload();
    } catch (err: any) {
      alert("Failed to resolve challenge: " + (err?.message ?? "unknown error"));
    } finally {
      setResolving(false);
    }
  }

  // 5. Claim Winnings
  async function handleClaim() {
    if (!wallet || !contractChallengeId) return;
    setClaimLoading(true);
    try {
      const program = getAnchorProgram();
      const [challengePda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("challenge"),
          new TextEncoder().encode(contractChallengeId)
        ],
        program.programId
      );
      const [betPda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("bet"),
          challengePda.toBuffer(),
          wallet.publicKey.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .claim()
        .accounts({
          challenge: challengePda,
          betEntry: betPda,
          user: wallet.publicKey,
        })
        .rpc();

      setClaimSuccess(true);
      router.refresh();
    } catch (err: any) {
      alert("Failed to claim winnings: " + (err?.message ?? "unknown error"));
    } finally {
      setClaimLoading(false);
    }
  }

  // --- RENDER ---

  if (claimSuccess) {
    return (
      <div className="bg-[#00FF87]/10 border border-[#00FF87]/20 rounded-2xl p-5 text-center shadow-[0_0_20px_rgba(0,255,135,0.1)]">
        <CheckCircle className="text-[#00FF87] mx-auto mb-2" size={24} />
        <p className="text-[#00FF87] font-medium">Winnings claimed to wallet!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 1. INITIALIZED — waiting for an opponent */}
      {isOwner && status === "INITIALIZED" && !hasOpponent && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 text-center">
          <div className="text-zinc-400 text-sm">
            <span className="text-white font-medium">Waiting for Opponent</span> — share your invite link.
            Challenge becomes <span className="text-[#00FF87] font-medium">Active</span> when a friend accepts the duel.
          </div>
        </div>
      )}

      {/* 2. RESOLVED — winner claimed */}
      {status === "RESOLVED" && (
        <div className="bg-[#00FF87]/10 border border-[#00FF87]/20 rounded-2xl p-5 text-center shadow-[0_0_20px_rgba(0,255,135,0.1)]">
          <CheckCircle className="text-[#00FF87] mx-auto mb-2" size={24} />
          <p className="text-[#00FF87] font-medium">Challenge Resolved</p>
          <p className="text-zinc-400 text-sm mt-1">Check your wallet if you won!</p>
        </div>
      )}

      {/* Share invite link — owner, before deadline */}
      {isOwner && (status === "ACTIVE" || status === "INITIALIZED") && inviteToken && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={16} className="text-purple-400" />
            <h3 className="text-purple-400 font-medium">Share Invite Link</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-3">
            {hasOpponent
              ? "Your opponent has joined! Share this link for spectators to bet."
              : "Share this link with a friend to challenge them to a 1v1 duel."}
          </p>
          <Button onClick={handleCopyInviteLink} variant="secondary" className="w-full">
            {copied ? <Check size={16} className="text-[#00FF87]" /> : <Copy size={16} />}
            {copied ? "Link copied!" : "Copy Invite Link"}
          </Button>
        </div>
      )}

      {/* Register on-chain (Fallback) */}
      {isOwner && (status === "ACTIVE" || status === "INITIALIZED") && !contractChallengeId && (
        <div className="rounded-2xl border border-[#0066FF]/20 bg-[#0066FF]/5 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={16} className="text-[#0066FF]" />
            <h3 className="text-[#0066FF] font-medium">Register On-Chain</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-3">
            Register on Solana to enable dueling. Stake: 0.02 SOL.
          </p>
          <Button
            onClick={handleRegisterOnChain}
            loading={registering}
            className="w-full bg-[#0066FF] hover:bg-[#0066FF]/90 text-white"
          >
            {registering ? "Registering..." : "Register On-Chain (0.02 SOL)"}
          </Button>
        </div>
      )}

      {/* JOIN DUEL: Non-owner, INITIALIZED (Waiting), Has valid invite */}
      {!isOwner && status === "INITIALIZED" && !hasOpponent && inviteToken && (
        <Button className="w-full" onClick={handleJoinDuel} loading={joining}>
          <Swords size={16} className="mr-2" />
          Accept Duel (Stake 0.02 SOL)
        </Button>
      )}

      {/* PLACE BET: Non-owner, ACTIVE, Not the Opponent */}
      {!isOwner && !isOpponent && status === "ACTIVE" && !pastDeadline && inviteToken && (
        <>
          <Button className="w-full" onClick={() => setBetOpen(true)}>
            <TrendingUp size={16} className="mr-2" />
            Place a Bet
          </Button>
          <PlaceBetDialog
            open={betOpen}
            onClose={() => setBetOpen(false)}
            challengeId={challengeId}
            contractChallengeId={contractChallengeId}
            challengeTitle={challengeTitle}
            inviteToken={inviteToken}
            onSuccess={() => router.refresh()}
          />
        </>
      )}

      {/* No invite / Locked */}
      {!isOwner && !pastDeadline && !hasExistingBet && !inviteToken && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 text-center">
          <Lock size={20} className="text-zinc-500 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">
            This challenge is private. Ask the creator for an invite link.
          </p>
        </div>
      )}

      {/* Report outcome — Creator ONLY, past deadline */}
      {isOwner && status === "ACTIVE" && pastDeadline && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
          <h3 className="text-white font-medium mb-1">Report Outcome</h3>
          <p className="text-zinc-400 text-sm mb-4">
            The deadline has passed. Who won the duel?
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => handleResolve("CREATOR")}
              loading={resolving}
              className="flex-1"
            >
              <CheckCircle size={16} className="mr-1" />
              I Won!
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleResolve("OPPONENT")}
              loading={resolving}
              className="flex-1"
            >
              <XCircle size={16} className="mr-1" />
              Opponent Won
            </Button>
          </div>
        </div>
      )}

      {/* Claim winnings — If user bet aligns with the Winner */}
      {/* Assuming backend translates the Winner to COMPLETED for Creator Win, FAILED for Opponent win for legacy reasons, 
          OR you updated DB to track `winner === "CREATOR" | "OPPONENT"` */}
      {((status as string) === "COMPLETED" || status === "RESOLVED") && contractChallengeId && hasExistingBet && (
        <Button
          className="w-full"
          onClick={handleClaim}
          loading={claimLoading}
        >
          Claim Winnings
        </Button>
      )}

    </div>
  );
}