// app/_layout.tsx
// Root layout — handles auth gate + deep link preservation.
//
// When a friend taps an invite link:
// 1. App opens (or launches)
// 2. If not logged in → goes to login, but SAVES the deep link URL
// 3. After login → redirects to the saved challenge URL with invite token
// 4. If already logged in → goes directly to the challenge

import "../polyfills";
import "../global.css";

import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { Slot, useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import { Providers } from "../providers";
import { useAuth } from "../providers/AuthProvider";
import { View, ActivityIndicator, Text } from "react-native";

global.Buffer = Buffer

function AuthGate() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Store the deep link URL that was opened before auth completed
  const pendingDeepLink = useRef<string | null>(null);

  // Listen for incoming deep links
  useEffect(() => {
    // Check if app was opened via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[DeepLink] App opened with URL:", url);
        const parsed = parseDeepLink(url);
        if (parsed) {
          pendingDeepLink.current = parsed;
        }
      }
    });

    // Listen for links while app is running (user taps link in another app)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("[DeepLink] Received URL while running:", url);
      const parsed = parseDeepLink(url);
      if (parsed && isAuthenticated) {
        // Already logged in → navigate immediately
        router.push(parsed as any);
      } else if (parsed) {
        // Not logged in → save for after auth
        pendingDeepLink.current = parsed;
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated]);

  // Auth-based navigation
  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (isAuthenticated && !inTabsGroup) {
      // Just authenticated — check for pending deep link
      if (pendingDeepLink.current) {
        console.log("[DeepLink] Navigating to saved link:", pendingDeepLink.current);
        const link = pendingDeepLink.current;
        pendingDeepLink.current = null;
        router.replace(link as any);
      } else {
        router.replace("/(tabs)/dashboard");
      }
    } else if (!isAuthenticated && inTabsGroup) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#00FF87" />
        <Text className="text-zinc-500 text-sm mt-4">Loading...</Text>
      </View>
    );
  }

  return <Slot />;
}

/**
 * Parse a deep link URL into an internal route path.
 *
 * Handles these formats:
 * - treno://challenges/abc123?invite=xxx
 * - https://treno.fun/challenges/abc123?invite=xxx
 *
 * Returns: "/(tabs)/challenges/abc123?invite=xxx"
 */
function parseDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    console.log("[DeepLink] Parsed:", JSON.stringify(parsed));

    // Extract challenge ID from path
    // path might be "challenges/abc123" or "/challenges/abc123"
    const path = parsed.path?.replace(/^\//, "") || "";
    const match = path.match(/^challenges\/(.+)/);

    if (match) {
      const challengeId = match[1];
      const invite = parsed.queryParams?.invite;
      let route = `/(tabs)/challenges/${challengeId}`;
      if (invite) {
        route += `?invite=${invite}`;
      }
      console.log("[DeepLink] Resolved route:", route);
      return route;
    }

    return null;
  } catch (e) {
    console.error("[DeepLink] Parse error:", e);
    return null;
  }
}

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="light" />
      <AuthGate />
    </Providers>
  );
}