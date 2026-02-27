// app/(tabs)/challenges/index.tsx
// Challenge list — shows all challenges the user created or joined.

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { getChallenges } from "../../../lib/api";
import { Card, Badge, ProgressBar, EmptyState, SectionHeader } from "../../../components/ui";
import type { Challenge, ChallengeStatus } from "../../../lib/types";
import { Plus, Trophy, Clock, Users } from "lucide-react-native";
import * as Haptics from "expo-haptics";

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

export default function ChallengesListScreen() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await getChallenges();
      setChallenges(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchData();
    setRefreshing(false);
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-14 pb-8"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#00FF87"
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center gap-2">
          <Trophy size={22} color="#EAB308" />
          <Text className="text-white text-2xl font-bold">Challenges</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(tabs)/challenges/new");
          }}
          className="flex-row items-center gap-1.5 bg-primary px-4 py-2.5 rounded-xl"
          activeOpacity={0.8}
        >
          <Plus size={14} color="#000" />
          <Text className="text-black font-semibold text-sm">New</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View className="items-center py-12">
          <Text className="text-zinc-500">Loading challenges...</Text>
        </View>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={<Trophy size={32} color="#3f3f46" />}
          message="No challenges yet. Create your first one!"
          action={
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/challenges/new")}
              className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-2.5"
            >
              <Text className="text-primary font-semibold text-sm">
                Create Challenge
              </Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <View className="gap-3">
          {challenges.map((c) => {
            const daysLeft = Math.max(
              0,
              Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000)
            );

            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push(`/(tabs)/challenges/${c.id}`)}
                activeOpacity={0.7}
              >
                <Card>
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text
                        className="text-white font-semibold text-sm"
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                      <Text className="text-zinc-500 text-xs mt-0.5">
                        {c.creator.name || "Creator"}
                        {c.opponent
                          ? ` vs ${c.opponent.name || "Opponent"}`
                          : " — waiting for opponent"}
                      </Text>
                    </View>
                    <Badge variant={statusVariant[c.status]}>
                      {c.status.replace("_", " ")}
                    </Badge>
                  </View>

                  {c.challengeMode !== "MULTI_DAY" && (
                    <View className="mt-2">
                      <ProgressBar
                        value={c.creatorProgress}
                        max={c.goalTarget}
                      />
                      <Text className="text-zinc-400 text-xs mt-1">
                        {c.creatorProgress.toFixed(1)} / {c.goalTarget}{" "}
                        {c.goalUnit}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center gap-4 mt-2">
                    <View className="flex-row items-center gap-1">
                      <Clock size={10} color="#71717a" />
                      <Text className="text-zinc-500 text-xs">
                        {daysLeft > 0 ? `${daysLeft}d left` : "Ended"}
                      </Text>
                    </View>
                    {c._count.bets > 0 && (
                      <View className="flex-row items-center gap-1">
                        <Users size={10} color="#71717a" />
                        <Text className="text-zinc-500 text-xs">
                          {c._count.bets} bet{c._count.bets !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
