"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dumbbell, Wallet, AlertCircle } from "lucide-react";
import Link from "next/link";
import bs58 from "bs58"; // Make sure to npm install bs58

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  async function handleSignIn() {
    if (!publicKey || !signMessage) return;
    setSigningIn(true);
    setError(null);
    try {
      const message = `Sign in to treno.fun\n\nAddress: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      // Request signature from Solana wallet
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      const result = await signIn("credentials", {
        address: publicKey.toBase58(),
        message,
        signature,
        redirect: false,
      });

      if (result?.error) {
        setError("Sign-in failed. Please try again.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message?.includes("User rejected") ? "Signature rejected." : "Something went wrong.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Dumbbell className="text-green-400" size={28} />
          <span className="text-white font-bold text-2xl">treno.fun</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-white text-xl font-semibold mb-1">Connect your wallet</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Sign in with your Solana Wallet to duel, place bets, and talk to your AI coach.
          </p>

          {!connected ? (
            <button
              onClick={() => setVisible(true)}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Wallet size={18} />
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 flex items-center justify-between">
                <span className="font-mono">
                  {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="text-zinc-500 hover:text-red-400 text-xs transition-colors"
                >
                  Disconnect
                </button>
              </div>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {signingIn ? "Signing..." : "Sign in"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}