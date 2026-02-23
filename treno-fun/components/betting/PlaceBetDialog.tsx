"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "@/lib/anchor";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Loader2, Wallet, Swords } from "lucide-react";

interface PlaceBetDialogProps {
  open: boolean;
  onClose: () => void;
  challengeId: string;
  contractChallengeId: string | null;
  challengeTitle: string;
  inviteToken: string;
  onSuccess?: () => void;
}

export function PlaceBetDialog({
  open,
  onClose,
  challengeId,
  contractChallengeId,
  challengeTitle,
  inviteToken,
  onSuccess,
}: PlaceBetDialogProps) {
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<"CREATOR" | "OPPONENT">("CREATOR");
  const [error, setError] = useState<string | null>(null);
  
  // Custom loading states to replace Wagmi's hooks
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [persisting, setPersisting] = useState(false);

  // Solana Hooks
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const isConnected = !!wallet;

  async function handlePersist(txHash: string, lamportsStr: string) {
    setPersisting(true);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          side, // "CREATOR" or "OPPONENT" (maps to Prisma BetSide Enum)
          amountSol: amount,
          amountLamports: lamportsStr,
          txHash,
          inviteToken,
        }),
      });
      if (!res.ok) throw new Error("Failed to save bet");
      onSuccess?.();
      handleClose();
    } catch {
      setError("Bet was placed on-chain but failed to save. Contact support.");
    } finally {
      setPersisting(false);
    }
  }

  async function handlePlaceBet() {
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }

    if (!contractChallengeId || !wallet) {
      setError("Challenge isn't registered on-chain or wallet disconnected.");
      return;
    }

    setIsPending(true);
    setIsSuccess(false);

    try {
      const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
      const program = getProgram(provider);

      // 1. Derive Challenge PDA
      const [challengePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("challenge"), Buffer.from(contractChallengeId)],
        program.programId
      );

      // 2. Derive Bet PDA
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), challengePda.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      // 3. Format Arguments
      const amountLamports = new BN(parseFloat(amount) * LAMPORTS_PER_SOL);
      const sideArg = side === "CREATOR" ? { creator: {} } : { opponent: {} };

      // 4. Execute RPC
      const txHash = await program.methods
        .placeBet(sideArg as any, amountLamports)
        .accounts({
          challenge: challengePda,
          betEntry: betPda,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setIsPending(false);
      setIsSuccess(true);
      
      // 5. Save to database
      await handlePersist(txHash, amountLamports.toString());

    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Transaction failed");
      setIsPending(false);
    }
  }

  function handleClose() {
    setAmount("");
    setSide("CREATOR");
    setError(null);
    setIsPending(false);
    setIsSuccess(false);
    onClose();
  }

  if (!isConnected) {
    return (
      <Dialog open={open} onClose={handleClose} title="Place a Bet">
        <div className="text-center py-6">
          <Wallet size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">Connect your Solana wallet to place bets.</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Place a Bet">
      <div className="space-y-5">
        <p className="text-zinc-400 text-sm">
          Bet on: <span className="text-white font-medium">&quot;{challengeTitle}&quot;</span>
        </p>

        {/* Side toggle */}
        <div>
          <p className="text-sm font-medium text-zinc-300 mb-2">Who will win the duel?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("CREATOR")}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${side === "CREATOR"
                ? "border-[#00FF87]/40 bg-[#00FF87]/10 text-[#00FF87] shadow-[0_0_20px_rgba(0,255,135,0.1)]"
                : "border-white/[0.06] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-300"
                }`}
            >
              <TrendingUp size={16} />
              Creator Wins
            </button>
            <button
              onClick={() => setSide("OPPONENT")}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${side === "OPPONENT"
                ? "border-purple-500/40 bg-purple-500/10 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                : "border-white/[0.06] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-300"
                }`}
            >
              <Swords size={16} />
              Opponent Wins
            </button>
          </div>
        </div>

        <Input
          label="Amount (SOL)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          id="betAmount"
        />

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/5 border border-red-400/10 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Status */}
        {isPending && (
          <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm py-2">
            <Loader2 size={14} className="animate-spin" />
            Confirming on Solana...
          </div>
        )}
        {isSuccess && (
          <div className="flex items-center justify-center gap-2 text-[#00FF87] text-sm py-2">
            <CheckCircle2 size={14} />
            Bet placed! Saving...
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <button
            onClick={handlePlaceBet}
            disabled={isPending || !!isSuccess || persisting}
            className="flex-1 relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#00FF87] to-[#00CC6A] px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:shadow-[0_0_30px_rgba(0,255,135,0.25)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {(isPending || persisting) && <Loader2 size={14} className="animate-spin" />}
            {side === "CREATOR" ? "Bet on Creator ✓" : "Bet on Opponent ⚔️"}
          </button>
        </div>

        <p className="text-xs text-zinc-500 text-center">
          Network: Solana Devnet · 2% protocol fee applied on winnings
        </p>
      </div>
    </Dialog>
  );
}