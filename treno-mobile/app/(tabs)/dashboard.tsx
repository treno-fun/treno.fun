// app/(tabs)/dashboard.tsx
// Main dashboard — shows active challenges, recent workouts, and stats.
// Equivalent of the web app's app/(app)/dashboard/page.tsx

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../providers/AuthProvider";
import { getChallenges, getWorkouts } from "../../lib/api";
import { Card, Badge, ProgressBar, EmptyState, SectionHeader } from "../../components/ui";
import type { Challenge, Workout } from "../../lib/types";
import { Trophy, Dumbbell, Plus, Clock, Flame } from "lucide-react-native";
import * as Haptics from "expo-haptics";

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [c, w] = await Promise.all([
        getChallenges(),
        getWorkouts(5),
      ]);
      setChallenges(c.filter((ch) => ch.status === "ACTIVE"));
      setWorkouts(w);
    } catch {
      // Handle silently — user will see empty state
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

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-zinc-500">Loading...</Text>
      </View>
    );
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
      <Text className="text-white text-2xl font-bold mb-1">
        Hey, {user?.name ?? "Athlete"} 👋
      </Text>
      <Text className="text-zinc-500 text-sm mb-6">
        {challenges.length} active challenge{challenges.length !== 1 ? "s" : ""}
      </Text>

      {/* Quick Stats */}
      <View className="flex-row gap-3 mb-6">
        <Card className="flex-1 items-center py-3">
          <Trophy size={18} color="#EAB308" />
          <Text className="text-white text-xl font-bold mt-1">
            {challenges.length}
          </Text>
          <Text className="text-zinc-500 text-[10px]">ACTIVE</Text>
        </Card>
        <Card className="flex-1 items-center py-3">
          <Dumbbell size={18} color="#00FF87" />
          <Text className="text-white text-xl font-bold mt-1">
            {workouts.length}
          </Text>
          <Text className="text-zinc-500 text-[10px]">WORKOUTS</Text>
        </Card>
        <Card className="flex-1 items-center py-3">
          <Flame size={18} color="#F97316" />
          <Text className="text-white text-xl font-bold mt-1">
            {user?._count?.bets ?? 0}
          </Text>
          <Text className="text-zinc-500 text-[10px]">BETS</Text>
        </Card>
      </View>

      {/* Active Challenges */}
      <SectionHeader
        title="Active Challenges"
        right={
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/challenges/new")}
            className="flex-row items-center gap-1"
          >
            <Plus size={14} color="#00FF87" />
            <Text className="text-primary text-xs font-semibold">New</Text>
          </TouchableOpacity>
        }
      />

      {challenges.length === 0 ? (
        <EmptyState
          message="No active challenges yet."
          action={
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/challenges/new")}
              className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2"
            >
              <Text className="text-primary font-semibold text-sm">
                Create Challenge
              </Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <View className="gap-3 mb-6">
          {challenges.slice(0, 3).map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => router.push(`/(tabs)/challenges/${c.id}`)}
              activeOpacity={0.7}
            >
              <Card>
                <View className="flex-row items-start justify-between mb-2">
                  <Text
                    className="text-white font-semibold text-sm flex-1 mr-2"
                    numberOfLines={1}
                  >
                    {c.title}
                  </Text>
                  <Badge variant="success">{c.status}</Badge>
                </View>
                <ProgressBar
                  value={c.creatorProgress}
                  max={c.goalTarget}
                />
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-zinc-400 text-xs">
                    {c.creatorProgress.toFixed(1)} / {c.goalTarget}{" "}
                    {c.goalUnit}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Clock size={10} color="#71717a" />
                    <Text className="text-zinc-500 text-xs">
                      {Math.max(
                        0,
                        Math.ceil(
                          (new Date(c.deadline).getTime() - Date.now()) / 86400000
                        )
                      )}
                      d left
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Workouts */}
      <SectionHeader title="Recent Workouts" />
      {workouts.length === 0 ? (
        <EmptyState message="No workouts logged yet." />
      ) : (
        <Card>
          {workouts.map((w, i) => (
            <View
              key={w.id}
              className={`flex-row items-center gap-3 py-3 ${i < workouts.length - 1 ? "border-b border-white/[0.04]" : ""
                }`}
            >
              <View
                className={`w-9 h-9 rounded-xl items-center justify-center ${w.source === "STRAVA"
                    ? "bg-orange-500/10"
                    : "bg-primary/10"
                  }`}
              >
                <Dumbbell
                  size={16}
                  color={w.source === "STRAVA" ? "#F97316" : "#00FF87"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-medium">
                  {w.name ?? w.workoutType}
                </Text>
                <View className="flex-row items-center gap-3 mt-0.5">
                  {w.durationSeconds && (
                    <Text className="text-zinc-500 text-xs">
                      {Math.round(w.durationSeconds / 60)}m
                    </Text>
                  )}
                  {w.distanceMeters && w.distanceMeters > 0 && (
                    <Text className="text-zinc-500 text-xs">
                      {(w.distanceMeters / 1000).toFixed(1)}km
                    </Text>
                  )}
                  {w.caloriesBurned && (
                    <Text className="text-zinc-500 text-xs">
                      {w.caloriesBurned}kcal
                    </Text>
                  )}
                </View>
              </View>
              <Text className="text-zinc-600 text-xs">
                {new Date(w.startTime).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
