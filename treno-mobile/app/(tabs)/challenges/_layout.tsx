// app/(tabs)/challenges/_layout.tsx
// Stack navigator for challenge screens within the Challenges tab.

import { Stack } from "expo-router";

export default function ChallengesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0A0A" },
        animation: "slide_from_right",
      }}
    />
  );
}
