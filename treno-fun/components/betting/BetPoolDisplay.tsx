import { TrendingUp, Swords } from "lucide-react";

interface BetPoolDisplayProps {
  totalCreator: string;
  totalOpponent: string;
  betCount: number;
}

// Convert Lamports to SOL
function lamportsToSol(lamports: string): string {
  if (!lamports || lamports === "0") return "0.000";
  return (Number(BigInt(lamports)) / 1e9).toFixed(3);
}

function poolPercent(a: string, b: string): number {
  const numA = Number(BigInt(a || "0"));
  const numB = Number(BigInt(b || "0"));
  const total = numA + numB;
  if (total === 0) return 50;
  return Math.round((numA / total) * 100);
}

export function BetPoolDisplay({ totalCreator, totalOpponent, betCount }: BetPoolDisplayProps) {
  const creatorPct = poolPercent(totalCreator, totalOpponent);
  const opponentPct = 100 - creatorPct;
  const totalSol = lamportsToSol(
    String(BigInt(totalCreator || "0") + BigInt(totalOpponent || "0"))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{betCount} bets placed</span>
        <span className="text-white font-semibold">{totalSol} SOL total</span>
      </div>

      {/* Pool bar with gradient segments */}
      <div className="relative flex h-3 rounded-full overflow-hidden bg-white/[0.04]">
        <div
          className="bg-gradient-to-r from-[#00FF87] to-[#00CC6A] transition-all duration-700 relative"
          style={{ width: `${creatorPct}%` }}
        >
          <div className="absolute inset-y-0 right-0 w-2 bg-white/20 blur-sm" />
        </div>
        <div
          className="bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-700 relative"
          style={{ width: `${opponentPct}%` }}
        >
          <div className="absolute inset-y-0 left-0 w-2 bg-white/20 blur-sm" />
        </div>
      </div>

      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[#00FF87]">
          <TrendingUp size={12} />
          <span>CREATOR {creatorPct}% · {lamportsToSol(totalCreator)} SOL</span>
        </div>
        <div className="flex items-center gap-1.5 text-purple-400">
          <span>OPPONENT {opponentPct}% · {lamportsToSol(totalOpponent)} SOL</span>
          <Swords size={12} />
        </div>
      </div>
    </div>
  );
}