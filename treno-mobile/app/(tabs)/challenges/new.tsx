// app/(tabs)/challenges/new.tsx
// Create challenge — form + on-chain registration via MWA.

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { createChallenge } from "../../../lib/api";
import { initializeChallengeOnChain } from "../../../lib/solana";
import { Button } from "../../../components/ui";
import { ArrowLeft, CalendarDays, CheckCircle } from "lucide-react-native";
import { GOAL_TYPE_LABELS, type GoalType } from "../../../lib/types";
import * as Haptics from "expo-haptics";
// import { testRpcConnection } from "../../../lib/solana";

const goalUnitMap: Record<GoalType, string> = {
  DISTANCE_KM: "km",
  WEIGHT_LOSS_KG: "kg",
  WORKOUT_COUNT: "workouts",
  CALORIES_BURNED: "kcal",
  CUSTOM: "units",
};

const goalTypes = Object.keys(GOAL_TYPE_LABELS) as GoalType[];

export default function NewChallengeScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("DISTANCE_KM");
  const [goalTarget, setGoalTarget] = useState("");
  const [days, setDays] = useState("1");
  const [description, setDescription] = useState("");
  const [checkInSource, setCheckInSource] = useState<"MANUAL" | "STRAVA">(
    "MANUAL"
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const numDays = parseInt(days) || 1;
  const isMultiDay = numDays > 1;

  async function handleCreate() {
    // await testRpcConnection();
    if (!title.trim()) return Alert.alert("Error", "Title is required");
    if (!goalTarget && !isMultiDay)
      return Alert.alert("Error", "Target is required");

    setLoading(true);
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + numDays);
      deadline.setHours(23, 59, 59);

      // 1. Register on-chain FIRST via MWA
      setStatus("Approve in wallet to register on-chain...");
      const challengeIdStr = Array.from(
        globalThis.crypto.getRandomValues(new Uint8Array(16)),
        (b) => b.toString(16).padStart(2, "0")
      ).join("");
      const deadlineUnix = Math.floor(deadline.getTime() / 1000);

      const { txHash, contractChallengeId } =
        await initializeChallengeOnChain({
          challengeIdStr,
          deadlineUnix,
        });

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      // 2. On-chain succeeded — now create in backend with the on-chain data
      setStatus("Saving challenge...");
      const challenge = await createChallenge({
        title: title.trim(),
        description: description.trim() || undefined,
        challengeMode: isMultiDay ? "MULTI_DAY" : "SINGLE_DAY",
        goalType: isMultiDay ? "WORKOUT_COUNT" : goalType,
        goalTarget: isMultiDay ? numDays : parseFloat(goalTarget),
        goalUnit: isMultiDay ? "days" : goalUnitMap[goalType],
        deadline: deadline.toISOString(),
        checkInSource,
        contractChallengeId,
        txHash,
      });

      setStatus(null);
      router.replace(`/(tabs)/challenges/${challenge.id}`);
    } catch (err: any) {
      setStatus(null);
      if (err?.message?.includes("User rejected")) {
        // User cancelled the wallet transaction — do nothing
        return;
      }
      Alert.alert("Error", err.message || "Failed to create challenge");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle =
    "bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-14 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center gap-1 mb-6"
      >
        <ArrowLeft size={16} color="#a1a1aa" />
        <Text className="text-zinc-400 text-sm">Back</Text>
      </TouchableOpacity>

      <Text className="text-white text-2xl font-bold mb-1">
        Create a Challenge
      </Text>
      <Text className="text-zinc-400 text-sm mb-6">
        Set a fitness goal and challenge your friends.
      </Text>

      <View className="bg-surface rounded-2xl border border-white/[0.06] p-5 gap-4">
        {/* Title */}
        <View>
          <Text className="text-zinc-300 text-sm font-medium mb-1.5">
            Challenge title
          </Text>
          <TextInput
            className={inputStyle}
            placeholder='e.g. "Run 100km in 30 days"'
            placeholderTextColor="#52525b"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Goal type */}
        <View>
          <Text className="text-zinc-300 text-sm font-medium mb-1.5">
            Goal type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {goalTypes.map((gt) => (
                <TouchableOpacity
                  key={gt}
                  onPress={() => setGoalType(gt)}
                  className={`px-3 py-2 rounded-lg border ${goalType === gt
                    ? "bg-primary/10 border-primary/30"
                    : "border-white/[0.08]"
                    }`}
                >
                  <Text
                    className={`text-xs font-medium ${goalType === gt ? "text-primary" : "text-zinc-400"
                      }`}
                  >
                    {GOAL_TYPE_LABELS[gt]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Target + Days */}
        <View className="flex-row gap-3">
          {!isMultiDay && (
            <View className="flex-1">
              <Text className="text-zinc-300 text-sm font-medium mb-1.5">
                Target ({goalUnitMap[goalType]})
              </Text>
              <TextInput
                className={inputStyle}
                placeholder="100"
                placeholderTextColor="#52525b"
                keyboardType="numeric"
                value={goalTarget}
                onChangeText={setGoalTarget}
              />
            </View>
          )}
          <View className={isMultiDay ? "flex-1" : "w-24"}>
            <Text className="text-zinc-300 text-sm font-medium mb-1.5">
              Days
            </Text>
            <TextInput
              className={inputStyle}
              placeholder="1"
              placeholderTextColor="#52525b"
              keyboardType="numeric"
              value={days}
              onChangeText={setDays}
            />
          </View>
        </View>

        {/* Multi-day indicator */}
        {isMultiDay && (
          <View className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex-row items-center gap-2">
            <CalendarDays size={16} color="#a855f6" />
            <Text className="text-purple-400 text-sm flex-1">
              Multi-day — {numDays} days of check-ins
            </Text>
          </View>
        )}

        {/* Check-in source */}
        {isMultiDay && (
          <View>
            <Text className="text-zinc-300 text-sm font-medium mb-2">
              Check-in method
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setCheckInSource("MANUAL")}
                className={`flex-1 items-center py-3 rounded-xl border ${checkInSource === "MANUAL"
                  ? "bg-primary/10 border-primary/30"
                  : "border-white/[0.08]"
                  }`}
              >
                <CheckCircle
                  size={18}
                  color={checkInSource === "MANUAL" ? "#00FF87" : "#71717a"}
                />
                <Text
                  className={`text-xs font-medium mt-1 ${checkInSource === "MANUAL"
                    ? "text-primary"
                    : "text-zinc-400"
                    }`}
                >
                  Manual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCheckInSource("STRAVA")}
                className={`flex-1 items-center py-3 rounded-xl border ${checkInSource === "STRAVA"
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "border-white/[0.08]"
                  }`}
              >
                <Text
                  className={`text-sm font-bold ${checkInSource === "STRAVA"
                    ? "text-orange-400"
                    : "text-zinc-500"
                    }`}
                >
                  S
                </Text>
                <Text
                  className={`text-xs font-medium mt-1 ${checkInSource === "STRAVA"
                    ? "text-orange-400"
                    : "text-zinc-400"
                    }`}
                >
                  Strava
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Description */}
        <View>
          <Text className="text-zinc-300 text-sm font-medium mb-1.5">
            Description (optional)
          </Text>
          <TextInput
            className={`${inputStyle} min-h-[80px]`}
            placeholder="What's the story behind this challenge?"
            placeholderTextColor="#52525b"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Status */}
        {status && (
          <View className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5">
            <Text className="text-yellow-400 text-xs text-center">
              {status}
            </Text>
          </View>
        )}

        {/* Submit */}
        <Button onPress={handleCreate} loading={loading}>
          {loading ? "Processing..." : "Create Challenge (0.02 SOL)"}
        </Button>

        <Text className="text-zinc-600 text-xs text-center">
          Stakes 0.02 SOL on Solana Devnet to register on-chain
        </Text>
      </View>
    </ScrollView>
  );
}