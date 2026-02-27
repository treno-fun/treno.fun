// app/index.tsx
// Login screen — connects to Phantom via MWA.

import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { Button } from "../components/ui";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setStatus("Opening wallet...");
    try {
      await signIn();
      setStatus("Connected!");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Auth gate in _layout.tsx will auto-redirect to dashboard
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus(null);

      const msg = err?.message || "";
      console.error("[Login] Error:", msg);

      if (msg.includes("Found no installed wallet")) {
        Alert.alert(
          "No Wallet Found",
          "Install Phantom or Solflare from the Play Store, then try again."
        );
      } else if (msg.includes("User rejected") || msg.includes("declined") || msg.includes("CancellationException")) {
        Alert.alert("Cancelled", "You cancelled the wallet connection.");
      } else if (msg.includes("Failed to fetch") || msg.includes("Network")) {
        Alert.alert(
          "Network Error",
          "Cannot reach the server. Check your internet connection."
        );
      } else {
        Alert.alert("Connection Failed", msg || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      {/* Logo */}
      <View className="items-center mb-10">
        <View className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-4">
          <Text className="text-primary text-2xl font-bold">T</Text>
        </View>
        <Text className="text-white text-3xl font-bold tracking-tight">
          treno.fun
        </Text>
        <Text className="text-zinc-500 text-sm mt-1">
          Put your money where your workout is
        </Text>
      </View>

      {/* Card */}
      <View className="w-full bg-surface rounded-2xl border border-white/[0.06] p-6">
        <Text className="text-white text-xl font-semibold mb-1">
          Connect your wallet
        </Text>
        <Text className="text-zinc-400 text-sm mb-6 leading-5">
          Sign in with your Solana wallet to create duels, place bets, and track
          your fitness.
        </Text>

        <Button onPress={handleConnect} loading={loading}>
          {loading ? "Connecting..." : "Connect Wallet"}
        </Button>

        {/* Status */}
        {status && (
          <View className="mt-3 bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5">
            <Text className="text-primary text-xs text-center">{status}</Text>
          </View>
        )}

        <Text className="text-zinc-600 text-xs text-center mt-4">
          Supports Phantom, Solflare, and other MWA wallets
        </Text>
      </View>

      <Text className="text-zinc-700 text-xs mt-8 text-center">
        Built on Solana · Powered by AI
      </Text>
    </View>
  );
}