// app/(tabs)/profile.tsx
// Profile screen — user info, wallet address, stats, sign out.

import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import { useAuth } from "../../providers/AuthProvider";
import { getProfile, getWorkouts, syncStrava } from "../../lib/api";
import { Card, Button, SectionHeader } from "../../components/ui";
import type { User, Workout } from "../../lib/types";
import {
  Wallet,
  Activity,
  Trophy,
  Dumbbell,
  RefreshCw,
  LogOut,
  CheckCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const { user, walletAddress, signOut, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [p, w] = await Promise.all([getProfile(), getWorkouts(5)]);
      setProfile(p);
      setWorkouts(w);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    await refreshUser();
    setRefreshing(false);
  }

  async function handleSyncStrava() {
    setSyncing(true);
    try {
      const result = await syncStrava();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Sync Complete",
        result.synced > 0
          ? `Synced ${result.synced} new activities`
          : "Already up to date"
      );
      await fetchData();
    } catch (err: any) {
      Alert.alert("Sync Failed", err.message || "Please try again");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }

  const displayProfile = profile || user;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-14 pb-8"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FF87" />
      }
    >
      <Text className="text-white text-2xl font-bold mb-6">Profile</Text>

      {/* User Info */}
      <Card className="mb-4">
        <View className="flex-row items-center gap-4 mb-4">
          <View className="w-14 h-14 rounded-full bg-primary/20 items-center justify-center">
            <Text className="text-primary font-bold text-xl">
              {(displayProfile?.name ?? "A")[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-white font-semibold text-lg">
              {displayProfile?.name ?? "Athlete"}
            </Text>
            <Text className="text-zinc-400 text-sm">
              Member since{" "}
              {displayProfile?.createdAt
                ? new Date(displayProfile.createdAt).toLocaleDateString()
                : "—"}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white/[0.03] rounded-xl py-3 items-center">
            <Trophy size={16} color="#EAB308" />
            <Text className="text-white font-bold text-lg mt-1">
              {(profile?._count?.challengesCreated ?? 0) +
                (profile?._count?.challengesJoined ?? 0)}
            </Text>
            <Text className="text-zinc-500 text-[10px]">CHALLENGES</Text>
          </View>
          <View className="flex-1 bg-white/[0.03] rounded-xl py-3 items-center">
            <Dumbbell size={16} color="#00FF87" />
            <Text className="text-white font-bold text-lg mt-1">
              {profile?._count?.workouts ?? 0}
            </Text>
            <Text className="text-zinc-500 text-[10px]">WORKOUTS</Text>
          </View>
          <View className="flex-1 bg-white/[0.03] rounded-xl py-3 items-center">
            <Activity size={16} color="#3B82F6" />
            <Text className="text-white font-bold text-lg mt-1">
              {profile?._count?.bets ?? 0}
            </Text>
            <Text className="text-zinc-500 text-[10px]">BETS</Text>
          </View>
        </View>
      </Card>

      {/* Wallet */}
      <Card className="mb-4">
        <View className="flex-row items-center gap-2 mb-3">
          <Wallet size={16} color="#a1a1aa" />
          <Text className="text-white font-semibold">Wallet</Text>
        </View>
        <View className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-4 py-3">
          <Text
            className="text-zinc-300 text-sm font-mono"
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {walletAddress || "Not connected"}
          </Text>
        </View>
      </Card>

      {/* Strava */}
      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Activity size={16} color="#a1a1aa" />
            <Text className="text-white font-semibold">Strava</Text>
            {profile?.stravaConnected && (
              <View className="w-2 h-2 rounded-full bg-primary" />
            )}
          </View>
        </View>

        {profile?.stravaConnected ? (
          <View className="gap-3">
            <View className="flex-row items-center gap-1.5">
              <CheckCircle size={14} color="#00FF87" />
              <Text className="text-primary text-sm">Connected</Text>
            </View>
            <Button
              variant="secondary"
              onPress={handleSyncStrava}
              loading={syncing}
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          </View>
        ) : (
          <Text className="text-zinc-400 text-sm">
            Strava connection available in web app. Sync from here once connected.
          </Text>
        )}
      </Card>

      {/* Recent Workouts */}
      {workouts.length > 0 && (
        <View className="mb-4">
          <SectionHeader title="Recent Workouts" />
          <Card>
            {workouts.map((w, i) => (
              <View
                key={w.id}
                className={`flex-row items-center gap-3 py-2.5 ${i < workouts.length - 1
                    ? "border-b border-white/[0.04]"
                    : ""
                  }`}
              >
                <View
                  className={`w-8 h-8 rounded-lg items-center justify-center ${w.source === "STRAVA" ? "bg-orange-500/10" : "bg-primary/10"
                    }`}
                >
                  <Dumbbell
                    size={14}
                    color={w.source === "STRAVA" ? "#F97316" : "#00FF87"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm">
                    {w.name ?? w.workoutType}
                  </Text>
                  <Text className="text-zinc-500 text-xs">
                    {new Date(w.startTime).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Sign Out */}
      <Button variant="danger" onPress={handleSignOut}>
        Sign Out
      </Button>
    </ScrollView>
  );
}
