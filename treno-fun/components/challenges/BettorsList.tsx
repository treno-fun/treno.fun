"use client";

import { Users } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

interface Bettor {
  user: { name: string | null; walletAddress: string | null };
  amountSol: string;
  side: string;
}

interface BettorsListProps {
  bets: Bettor[];
}

export function BettorsList({ bets }: BettorsListProps) {
  if (!bets || bets.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
      <div className="flex items-center gap-2 mb-4 text-zinc-400">
        <Users size={18} />
        <h3 className="font-medium text-sm">Joined Participants ({bets.length})</h3>
      </div>

      <div className="space-y-2">
        {bets.map((bet, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-white/[0.04] rounded-xl px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00FF87] to-[#00CC6A] flex items-center justify-center text-[10px] text-black font-bold">
                {(bet.user.name || "A")[0].toUpperCase()}
              </div>
              <span className="text-zinc-300 text-sm font-mono">
                {bet.user.name || shortenAddress(bet.user.walletAddress ?? "")}
              </span>
            </div>
            <div className="text-sm font-medium">
              <span className="text-white mr-2">{bet.amountSol} SOL</span>
              <span className={bet.side === "CREATOR" ? "text-[#00FF87]" : "text-purple-400"}>
                {bet.side}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}