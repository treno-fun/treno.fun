// // app/(tabs)/challenges/[id].tsx
// // Challenge detail — progress, bet pool, on-chain actions via MWA.

// import { useState, useEffect, useCallback } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   RefreshControl,
//   TouchableOpacity,
//   Alert,
// } from "react-native";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { useAuth } from "../../../providers/AuthProvider";
// import {
//   getChallenge,
//   checkIn as apiCheckIn,
//   registerChallengeOnChain as persistRegister,
//   joinChallenge as persistJoin,
//   resolveChallenge as persistResolve,
// } from "../../../lib/api";
// import {
//   initializeChallengeOnChain,
//   joinChallengeOnChain,
//   resolveChallengeOnChain,
//   claimWinningsOnChain,
// } from "../../../lib/solana";
// import { PlaceBetSheet } from "../../../components/ui/PlaceBetSheet";
// import { Card, Badge, Button, ProgressBar } from "../../../components/ui";
// import type { Challenge, ChallengeStatus } from "../../../lib/types";
// import {
//   ArrowLeft,
//   Calendar,
//   User as UserIcon,
//   Copy,
//   Check,
//   Swords,
//   TrendingUp,
//   Link2,
//   Lock,
//   CheckCircle,
//   XCircle,
//   Wallet,
// } from "lucide-react-native";
// import * as Haptics from "expo-haptics";
// import * as Clipboard from "expo-clipboard";

// const statusVariant: Record<
//   ChallengeStatus,
//   "default" | "success" | "warning" | "danger" | "info"
// > = {
//   INITIALIZED: "default",
//   ACTIVE: "success",
//   PENDING_RESOLUTION: "warning",
//   COMPLETED: "info",
//   FAILED: "danger",
//   RESOLVED: "success",
//   DISPUTED: "warning",
//   CANCELLED: "default",
// };

// export default function ChallengeDetailScreen() {
//   const { id } = useLocalSearchParams<{ id: string }>();
//   const { user } = useAuth();
//   const router = useRouter();

//   const [challenge, setChallenge] = useState<Challenge | null>(null);
//   const [refreshing, setRefreshing] = useState(false);
//   const [copied, setCopied] = useState(false);
//   const [checkingIn, setCheckingIn] = useState(false);
//   const [registering, setRegistering] = useState(false);
//   const [joining, setJoining] = useState(false);
//   const [resolving, setResolving] = useState(false);
//   const [claiming, setClaiming] = useState(false);
//   const [betSheetOpen, setBetSheetOpen] = useState(false);

//   const fetchData = useCallback(async () => {
//     if (!id) return;
//     try {
//       const data = await getChallenge(id);
//       setChallenge(data);
//     } catch {
//       Alert.alert("Error", "Failed to load challenge");
//     }
//   }, [id]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   async function onRefresh() {
//     setRefreshing(true);
//     await fetchData();
//     setRefreshing(false);
//   }

//   // ── Actions ──────────────────────────────────────────

//   async function handleCopyInvite() {
//     if (!challenge?.inviteToken) return;
//     const url = `https://treno.fun/challenges/${challenge.id}?invite=${challenge.inviteToken}`;
//     await Clipboard.setStringAsync(url);
//     setCopied(true);
//     await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//     setTimeout(() => setCopied(false), 2000);
//   }

//   async function handleCheckIn() {
//     if (!id) return;
//     setCheckingIn(true);
//     try {
//       await apiCheckIn(id);
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//       await fetchData();
//     } catch (err: any) {
//       Alert.alert("Error", err.message || "Check-in failed");
//     } finally {
//       setCheckingIn(false);
//     }
//   }

//   async function handleRegisterOnChain() {
//     if (!challenge || !id) return;
//     setRegistering(true);
//     try {
//       const challengeIdStr = id.replace(/-/g, "").slice(0, 32);
//       const deadlineUnix = Math.floor(
//         new Date(challenge.deadline).getTime() / 1000
//       );

//       const { txHash, contractChallengeId } =
//         await initializeChallengeOnChain({
//           challengeIdStr,
//           deadlineUnix,
//         });

//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

//       // Save to backend
//       await persistRegister(id, contractChallengeId, txHash);
//       await fetchData();
//     } catch (err: any) {
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       if (!err?.message?.includes("User rejected")) {
//         Alert.alert("Error", err.message || "Registration failed");
//       }
//     } finally {
//       setRegistering(false);
//     }
//   }

//   async function handleJoinDuel() {
//     if (!challenge?.contractChallengeId || !id) return;
//     setJoining(true);
//     try {
//       const txHash = await joinChallengeOnChain(
//         challenge.contractChallengeId
//       );
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

//       await persistJoin(id, txHash);
//       await fetchData();
//     } catch (err: any) {
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       if (!err?.message?.includes("User rejected")) {
//         Alert.alert("Error", err.message || "Failed to join");
//       }
//     } finally {
//       setJoining(false);
//     }
//   }

//   async function handleResolve(winner: "CREATOR" | "OPPONENT") {
//     if (!challenge?.contractChallengeId || !id) return;
//     setResolving(true);
//     try {
//       const txHash = await resolveChallengeOnChain({
//         contractChallengeId: challenge.contractChallengeId,
//         winner,
//       });
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

//       await persistResolve(id, winner, txHash);
//       await fetchData();
//     } catch (err: any) {
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       if (!err?.message?.includes("User rejected")) {
//         Alert.alert("Error", err.message || "Resolution failed");
//       }
//     } finally {
//       setResolving(false);
//     }
//   }

//   async function handleClaim() {
//     if (!challenge?.contractChallengeId) return;
//     setClaiming(true);
//     try {
//       await claimWinningsOnChain(challenge.contractChallengeId);
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//       Alert.alert("Success", "Winnings claimed to your wallet!");
//       await fetchData();
//     } catch (err: any) {
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       if (!err?.message?.includes("User rejected")) {
//         Alert.alert("Error", err.message || "Claim failed");
//       }
//     } finally {
//       setClaiming(false);
//     }
//   }

//   // ── Render ───────────────────────────────────────────

//   if (!challenge) {
//     return (
//       <View className="flex-1 bg-background items-center justify-center">
//         <Text className="text-zinc-500">Loading...</Text>
//       </View>
//     );
//   }

//   const isOwner = challenge.creatorId === user?.id;
//   const isOpponent = challenge.opponentId === user?.id;
//   const hasOpponent = !!challenge.opponentId;
//   const isMultiDay = challenge.challengeMode === "MULTI_DAY";
//   const pastDeadline = new Date(challenge.deadline) < new Date();
//   const userBet = challenge.bets?.find((b) => b.userId === user?.id);
//   const hasValidInvite = !!challenge.inviteToken;
//   const daysLeft = Math.max(
//     0,
//     Math.ceil(
//       (new Date(challenge.deadline).getTime() - Date.now()) / 86400000
//     )
//   );

//   const totalCreatorLamports = (challenge.bets || [])
//     .filter((b) => b.side === "CREATOR")
//     .reduce((sum, b) => sum + BigInt(b.amountLamports), BigInt(0));
//   const totalOpponentLamports = (challenge.bets || [])
//     .filter((b) => b.side === "OPPONENT")
//     .reduce((sum, b) => sum + BigInt(b.amountLamports), BigInt(0));
//   const totalPool = totalCreatorLamports + totalOpponentLamports;
//   const totalSol = Number(totalPool) / 1e9;

//   return (
//     <ScrollView
//       className="flex-1 bg-background"
//       contentContainerClassName="px-4 pt-14 pb-8"
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor="#00FF87"
//         />
//       }
//     >
//       {/* Back */}
//       <TouchableOpacity
//         onPress={() => router.back()}
//         className="flex-row items-center gap-1 mb-4"
//       >
//         <ArrowLeft size={16} color="#a1a1aa" />
//         <Text className="text-zinc-400 text-sm">Back</Text>
//       </TouchableOpacity>

//       {/* Header */}
//       <Card className="mb-4">
//         <View className="flex-row items-start justify-between mb-3">
//           <View className="flex-1 mr-2">
//             <Text className="text-white text-lg font-bold">
//               {challenge.title}
//             </Text>
//             <View className="flex-row items-center gap-2 mt-1">
//               <UserIcon size={12} color="#a1a1aa" />
//               <Text className="text-zinc-400 text-xs">
//                 {challenge.creator.name || "Creator"}
//                 {isOwner && " (you)"}
//                 {challenge.opponent && (
//                   <>
//                     {" vs "}
//                     {challenge.opponent.name || "Opponent"}
//                     {isOpponent && " (you)"}
//                   </>
//                 )}
//               </Text>
//             </View>
//             <View className="flex-row items-center gap-2 mt-1">
//               <Calendar size={12} color="#a1a1aa" />
//               <Text className="text-zinc-400 text-xs">
//                 {daysLeft > 0 ? `${daysLeft}d left` : "Ended"} ·{" "}
//                 {new Date(challenge.deadline).toLocaleDateString()}
//               </Text>
//             </View>
//           </View>
//           <Badge variant={statusVariant[challenge.status]}>
//             {challenge.status.replace("_", " ")}
//           </Badge>
//         </View>

//         {/* Progress */}
//         {!isMultiDay && (
//           <View className="gap-3 mt-2">
//             <View>
//               <View className="flex-row justify-between mb-1">
//                 <Text className="text-zinc-400 text-xs">
//                   {challenge.creator.name || "Creator"}
//                 </Text>
//                 <Text className="text-primary text-xs font-medium">
//                   {challenge.creatorProgress.toFixed(1)} / {challenge.goalTarget}
//                 </Text>
//               </View>
//               <ProgressBar
//                 value={challenge.creatorProgress}
//                 max={challenge.goalTarget}
//               />
//             </View>
//             {challenge.opponent && (
//               <View>
//                 <View className="flex-row justify-between mb-1">
//                   <Text className="text-zinc-400 text-xs">
//                     {challenge.opponent.name || "Opponent"}
//                   </Text>
//                   <Text className="text-purple-400 text-xs font-medium">
//                     {challenge.opponentProgress.toFixed(1)} /{" "}
//                     {challenge.goalTarget}
//                   </Text>
//                 </View>
//                 <ProgressBar
//                   value={challenge.opponentProgress}
//                   max={challenge.goalTarget}
//                   color="bg-purple-500"
//                 />
//               </View>
//             )}
//           </View>
//         )}

//         {isMultiDay && (
//           <View className="mt-2">
//             <Text className="text-zinc-400 text-xs mb-1">
//               Check-ins: {challenge.creatorProgress} / {challenge.goalTarget}{" "}
//               days
//             </Text>
//             <ProgressBar
//               value={challenge.creatorProgress}
//               max={challenge.goalTarget}
//             />
//           </View>
//         )}
//       </Card>

//       {/* Bet Pool */}
//       <Card className="mb-4">
//         <Text className="text-white font-semibold mb-3">Duel Prize Pool</Text>
//         <View className="flex-row items-center justify-between mb-2">
//           <Text className="text-zinc-400 text-sm">
//             {challenge._count.bets} bet
//             {challenge._count.bets !== 1 ? "s" : ""}
//           </Text>
//           <Text className="text-white font-semibold">
//             {totalSol.toFixed(3)} SOL
//           </Text>
//         </View>
//         <View className="h-3 rounded-full overflow-hidden flex-row bg-white/[0.04]">
//           <View
//             className="bg-primary h-full"
//             style={{
//               width: `${Number(totalPool) > 0
//                 ? (Number(totalCreatorLamports) / Number(totalPool)) * 100
//                 : 50
//                 }%`,
//             }}
//           />
//           <View className="bg-purple-500 h-full flex-1" />
//         </View>
//         <View className="flex-row justify-between mt-2">
//           <Text className="text-primary text-xs">
//             CREATOR {(Number(totalCreatorLamports) / 1e9).toFixed(3)}
//           </Text>
//           <Text className="text-purple-400 text-xs">
//             OPPONENT {(Number(totalOpponentLamports) / 1e9).toFixed(3)}
//           </Text>
//         </View>
//         {userBet && (
//           <View className="mt-3 bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.04]">
//             <Text className="text-zinc-400 text-xs">
//               Your bet:{" "}
//               <Text
//                 className={`font-medium ${userBet.side === "CREATOR"
//                   ? "text-primary"
//                   : "text-purple-400"
//                   }`}
//               >
//                 {userBet.amountSol} SOL on {userBet.side}
//               </Text>
//             </Text>
//           </View>
//         )}
//       </Card>

//       {/* ── ACTION CARDS ──────────────────────────────── */}
//       <View className="gap-3 mb-4">
//         {/* Share invite link (owner, active/initialized) */}
//         {isOwner &&
//           (challenge.status === "ACTIVE" ||
//             challenge.status === "INITIALIZED") &&
//           challenge.inviteToken && (
//             <Card>
//               <View className="flex-row items-center gap-2 mb-2">
//                 <Link2 size={14} color="#a855f6" />
//                 <Text className="text-purple-400 font-medium text-sm">
//                   Share Invite
//                 </Text>
//               </View>
//               <Text className="text-zinc-400 text-xs mb-3">
//                 {hasOpponent
//                   ? "Opponent joined! Share for spectators to bet."
//                   : "Share with a friend to start the duel."}
//               </Text>
//               <Button variant="secondary" onPress={handleCopyInvite}>
//                 {copied ? "Copied!" : "Copy Invite Link"}
//               </Button>
//             </Card>
//           )}

//         {/* Register on-chain (owner, no contract ID yet) */}
//         {isOwner &&
//           (challenge.status === "ACTIVE" ||
//             challenge.status === "INITIALIZED") &&
//           !challenge.contractChallengeId && (
//             <Card>
//               <View className="flex-row items-center gap-2 mb-2">
//                 <Wallet size={14} color="#3b82f6" />
//                 <Text className="text-blue-400 font-medium text-sm">
//                   Register On-Chain
//                 </Text>
//               </View>
//               <Text className="text-zinc-400 text-xs mb-3">
//                 Register on Solana to enable betting. Stakes 0.02 SOL.
//               </Text>
//               <Button onPress={handleRegisterOnChain} loading={registering}>
//                 {registering
//                   ? "Approve in wallet..."
//                   : "Register (0.02 SOL)"}
//               </Button>
//             </Card>
//           )}

//         {/* Join duel (non-owner, initialized, no opponent yet) */}
//         {!isOwner &&
//           challenge.status === "INITIALIZED" &&
//           !hasOpponent &&
//           challenge.contractChallengeId &&
//           hasValidInvite && (
//             <Button onPress={handleJoinDuel} loading={joining}>
//               {joining ? "Approve in wallet..." : "Accept Duel (0.02 SOL)"}
//             </Button>
//           )}

//         {/* Place bet (non-owner, non-opponent, active, not past deadline) */}
//         {!isOwner &&
//           !isOpponent &&
//           challenge.status === "ACTIVE" &&
//           !pastDeadline &&
//           challenge.contractChallengeId &&
//           hasValidInvite &&
//           !userBet && (
//             <Button onPress={() => setBetSheetOpen(true)}>
//               Place a Bet
//             </Button>
//           )}

//         {/* Private challenge (no invite) */}
//         {!isOwner &&
//           !isOpponent &&
//           !pastDeadline &&
//           !userBet &&
//           !hasValidInvite && (
//             <Card className="items-center py-4">
//               <Lock size={18} color="#71717a" />
//               <Text className="text-zinc-400 text-sm mt-2 text-center">
//                 Private challenge — ask the creator for an invite link.
//               </Text>
//             </Card>
//           )}

//         {/* Check-in (multi-day, active, participant) */}
//         {isMultiDay &&
//           challenge.status === "ACTIVE" &&
//           (isOwner || isOpponent) &&
//           !pastDeadline && (
//             <Button onPress={handleCheckIn} loading={checkingIn}>
//               {checkingIn ? "Checking in..." : "Check In for Today"}
//             </Button>
//           )}

//         {/* Resolve (owner, active, past deadline) */}
//         {isOwner &&
//           challenge.status === "ACTIVE" &&
//           pastDeadline &&
//           challenge.contractChallengeId && (
//             <Card>
//               <Text className="text-white font-medium mb-1">
//                 Report Outcome
//               </Text>
//               <Text className="text-zinc-400 text-xs mb-3">
//                 Deadline passed. Who won the duel?
//               </Text>
//               <View className="flex-row gap-3">
//                 <View className="flex-1">
//                   <Button
//                     onPress={() => handleResolve("CREATOR")}
//                     loading={resolving}
//                   >
//                     I Won!
//                   </Button>
//                 </View>
//                 <View className="flex-1">
//                   <Button
//                     variant="secondary"
//                     onPress={() => handleResolve("OPPONENT")}
//                     loading={resolving}
//                   >
//                     They Won
//                   </Button>
//                 </View>
//               </View>
//             </Card>
//           )}

//         {/* Claim winnings */}
//         {(challenge.status === "COMPLETED" ||
//           challenge.status === "RESOLVED") &&
//           challenge.contractChallengeId &&
//           userBet && (
//             <Button onPress={handleClaim} loading={claiming}>
//               {claiming ? "Approve in wallet..." : "Claim Winnings"}
//             </Button>
//           )}

//         {/* Resolved status */}
//         {challenge.status === "RESOLVED" && (
//           <Card className="items-center py-4 border-primary/20 bg-primary/5">
//             <CheckCircle size={22} color="#00FF87" />
//             <Text className="text-primary font-medium mt-2">
//               Challenge Resolved
//             </Text>
//           </Card>
//         )}

//         {/* Waiting for opponent */}
//         {isOwner &&
//           challenge.status === "INITIALIZED" &&
//           !hasOpponent && (
//             <Card className="items-center py-4">
//               <Text className="text-zinc-400 text-sm text-center">
//                 Waiting for an opponent to accept the duel...
//               </Text>
//             </Card>
//           )}
//       </View>

//       {/* Bettors */}
//       {challenge.bets && challenge.bets.length > 0 && (
//         <Card className="mb-4">
//           <Text className="text-zinc-400 text-sm font-medium mb-3">
//             Participants ({challenge.bets.length})
//           </Text>
//           {challenge.bets.map((bet) => (
//             <View
//               key={bet.id}
//               className="flex-row items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
//             >
//               <View className="flex-row items-center gap-2">
//                 <View className="w-6 h-6 rounded-full bg-primary/20 items-center justify-center">
//                   <Text className="text-primary text-[10px] font-bold">
//                     {(bet.user?.name || "A")[0].toUpperCase()}
//                   </Text>
//                 </View>
//                 <Text className="text-zinc-300 text-sm">
//                   {bet.user?.name ||
//                     `${bet.user?.walletAddress?.slice(0, 4)}...`}
//                 </Text>
//               </View>
//               <View className="flex-row items-center gap-2">
//                 <Text className="text-white text-sm font-medium">
//                   {bet.amountSol} SOL
//                 </Text>
//                 <Text
//                   className={`text-xs font-medium ${bet.side === "CREATOR"
//                     ? "text-primary"
//                     : "text-purple-400"
//                     }`}
//                 >
//                   {bet.side}
//                 </Text>
//               </View>
//             </View>
//           ))}
//         </Card>
//       )}

//       {/* Bet Sheet Modal */}
//       {challenge.contractChallengeId && challenge.inviteToken && (
//         <PlaceBetSheet
//           visible={betSheetOpen}
//           onClose={() => setBetSheetOpen(false)}
//           challengeId={challenge.id}
//           contractChallengeId={challenge.contractChallengeId}
//           challengeTitle={challenge.title}
//           inviteToken={challenge.inviteToken}
//           onSuccess={() => fetchData()}
//         />
//       )}
//     </ScrollView>
//   );
// }





// app/(tabs)/challenges/[id].tsx
// Challenge detail — reads invite token from deep link URL params.
// When a friend opens treno://challenges/abc?invite=xxx, this screen
// shows them the challenge with join/bet actions available.

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../providers/AuthProvider";
import {
  getChallenge,
  checkIn as apiCheckIn,
  registerChallengeOnChain as persistRegister,
  joinChallenge as persistJoin,
  resolveChallenge as persistResolve,
} from "../../../lib/api";
import {
  initializeChallengeOnChain,
  joinChallengeOnChain,
  resolveChallengeOnChain,
  claimWinningsOnChain,
} from "../../../lib/solana";
import { PlaceBetSheet } from "../../../components/ui/PlaceBetSheet";
import { CheckInCalendar } from "../../../components/challenges/CheckInCalendar";
import { Card, Badge, Button, ProgressBar } from "../../../components/ui";
import type { Challenge, ChallengeStatus } from "../../../lib/types";
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Share2,
  Swords,
  TrendingUp,
  Link2,
  Lock,
  CheckCircle,
  Wallet,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

const statusVariant: Record<
  ChallengeStatus,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  INITIALIZED: "default",
  ACTIVE: "success",
  PENDING_RESOLUTION: "warning",
  COMPLETED: "info",
  FAILED: "danger",
  RESOLVED: "success",
  DISPUTED: "warning",
  CANCELLED: "default",
};

export default function ChallengeDetailScreen() {
  // Read both id and invite from URL params.
  // invite comes from deep links: treno://challenges/abc?invite=xxx
  const { id, invite: urlInvite } = useLocalSearchParams<{
    id: string;
    invite?: string;
  }>();
  const { user } = useAuth();
  const router = useRouter();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [joining, setJoining] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [betSheetOpen, setBetSheetOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getChallenge(id);
      setChallenge(data);
    } catch {
      Alert.alert("Error", "Failed to load challenge");
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  // ── Derived state ────────────────────────────────────

  if (!challenge) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-zinc-500">Loading...</Text>
      </View>
    );
  }

  const isOwner = challenge.creatorId === user?.id;
  const isOpponent = challenge.opponentId === user?.id;
  const isParticipant = isOwner || isOpponent;
  const hasOpponent = !!challenge.opponentId;
  const isMultiDay = challenge.challengeMode === "MULTI_DAY";
  const pastDeadline = new Date(challenge.deadline) < new Date();
  const userBet = challenge.bets?.find((b) => b.userId === user?.id);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(challenge.deadline).getTime() - Date.now()) / 86400000)
  );

  // The invite token: use the one from the URL (deep link) or the one from the API
  const inviteToken =
    urlInvite || (isParticipant ? challenge.inviteToken : null);
  const hasValidInvite = !!inviteToken;

  // Bet pool calculations
  const totalCreatorLamports = (challenge.bets || [])
    .filter((b) => b.side === "CREATOR")
    .reduce((sum, b) => sum + BigInt(b.amountLamports), BigInt(0));
  const totalOpponentLamports = (challenge.bets || [])
    .filter((b) => b.side === "OPPONENT")
    .reduce((sum, b) => sum + BigInt(b.amountLamports), BigInt(0));
  const totalPool = totalCreatorLamports + totalOpponentLamports;
  const totalSol = Number(totalPool) / 1e9;

  // ── Actions ──────────────────────────────────────────

  async function handleShare() {
    if (!challenge?.inviteToken) return;

    const webUrl = `https://treno.fun/challenges/${challenge.id}?invite=${challenge.inviteToken}`;

    try {
      await Share.share({
        message: `🏋️ Challenge: "${challenge.title}"\n\nI dare you to a fitness duel on treno.fun!\n\n👉 ${webUrl}`,
        title: `treno.fun — ${challenge.title}`,
        url: webUrl,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // User cancelled share sheet
    }
  }



  async function handleRegisterOnChain() {
    if (!challenge || !id) return;
    setRegistering(true);
    try {
      const challengeIdStr = id.replace(/-/g, "").slice(0, 32);
      const deadlineUnix = Math.floor(
        new Date(challenge.deadline).getTime() / 1000
      );
      const { txHash, contractChallengeId } =
        await initializeChallengeOnChain({ challengeIdStr, deadlineUnix });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await persistRegister(id, contractChallengeId, txHash);
      await fetchData();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!err?.message?.includes("User rejected")) {
        Alert.alert("Error", err.message || "Registration failed");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleJoinDuel() {
    if (!challenge?.contractChallengeId || !id) return;
    setJoining(true);
    try {
      const txHash = await joinChallengeOnChain(challenge.contractChallengeId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await persistJoin(id, txHash);
      await fetchData();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!err?.message?.includes("User rejected")) {
        Alert.alert("Error", err.message || "Failed to join");
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleResolve(winner: "CREATOR" | "OPPONENT") {
    if (!challenge?.contractChallengeId || !id) return;
    setResolving(true);
    try {
      const txHash = await resolveChallengeOnChain({
        contractChallengeId: challenge.contractChallengeId,
        winner,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await persistResolve(id, winner, txHash);
      await fetchData();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!err?.message?.includes("User rejected")) {
        Alert.alert("Error", err.message || "Resolution failed");
      }
    } finally {
      setResolving(false);
    }
  }

  async function handleClaim() {
    if (!challenge?.contractChallengeId) return;
    setClaiming(true);
    try {
      await claimWinningsOnChain(challenge.contractChallengeId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Winnings claimed to your wallet!");
      await fetchData();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!err?.message?.includes("User rejected")) {
        Alert.alert("Error", err.message || "Claim failed");
      }
    } finally {
      setClaiming(false);
    }
  }

  // ── Render ───────────────────────────────────────────

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-14 pb-8"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FF87" />
      }
    >
      {/* Back */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center gap-1 mb-4"
      >
        <ArrowLeft size={16} color="#a1a1aa" />
        <Text className="text-zinc-400 text-sm">Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Card className="mb-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-2">
            <Text className="text-white text-lg font-bold">
              {challenge.title}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <UserIcon size={12} color="#a1a1aa" />
              <Text className="text-zinc-400 text-xs">
                {challenge.creator.name || "Creator"}
                {isOwner && " (you)"}
                {challenge.opponent && (
                  <>
                    {" vs "}
                    {challenge.opponent.name || "Opponent"}
                    {isOpponent && " (you)"}
                  </>
                )}
              </Text>
            </View>
            <View className="flex-row items-center gap-2 mt-1">
              <Calendar size={12} color="#a1a1aa" />
              <Text className="text-zinc-400 text-xs">
                {daysLeft > 0 ? `${daysLeft}d left` : "Ended"} ·{" "}
                {new Date(challenge.deadline).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Badge variant={statusVariant[challenge.status]}>
            {challenge.status.replace("_", " ")}
          </Badge>
        </View>

        {/* Progress */}
        {!isMultiDay && (
          <View className="gap-3 mt-2">
            <View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-zinc-400 text-xs">
                  {challenge.creator.name || "Creator"}
                </Text>
                <Text className="text-primary text-xs font-medium">
                  {challenge.creatorProgress.toFixed(1)} / {challenge.goalTarget}
                </Text>
              </View>
              <ProgressBar value={challenge.creatorProgress} max={challenge.goalTarget} />
            </View>
            {challenge.opponent && (
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-zinc-400 text-xs">
                    {challenge.opponent.name || "Opponent"}
                  </Text>
                  <Text className="text-purple-400 text-xs font-medium">
                    {challenge.opponentProgress.toFixed(1)} / {challenge.goalTarget}
                  </Text>
                </View>
                <ProgressBar
                  value={challenge.opponentProgress}
                  max={challenge.goalTarget}
                  color="bg-purple-500"
                />
              </View>
            )}
          </View>
        )}

        {isMultiDay && (
          <View className="mt-4 pt-4 border-t border-white/[0.04]">
            <CheckInCalendar
              challengeId={challenge.id}
              startDate={challenge.createdAt}
              endDate={challenge.deadline}
              isParticipant={isParticipant}
              onCheckInSuccess={() => fetchData()}
            />
          </View>
        )}
      </Card>

      {/* Bet Pool */}
      <Card className="mb-4">
        <Text className="text-white font-semibold mb-3">Duel Prize Pool</Text>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-zinc-400 text-sm">
            {challenge._count.bets} bet{challenge._count.bets !== 1 ? "s" : ""}
          </Text>
          <Text className="text-white font-semibold">
            {totalSol.toFixed(3)} SOL
          </Text>
        </View>
        <View className="h-3 rounded-full overflow-hidden flex-row bg-white/[0.04]">
          <View
            className="bg-primary h-full"
            style={{
              width: `${Number(totalPool) > 0
                ? (Number(totalCreatorLamports) / Number(totalPool)) * 100
                : 50
                }%`,
            }}
          />
          <View className="bg-purple-500 h-full flex-1" />
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-primary text-xs">
            CREATOR {(Number(totalCreatorLamports) / 1e9).toFixed(3)}
          </Text>
          <Text className="text-purple-400 text-xs">
            OPPONENT {(Number(totalOpponentLamports) / 1e9).toFixed(3)}
          </Text>
        </View>
        {userBet && (
          <View className="mt-3 bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.04]">
            <Text className="text-zinc-400 text-xs">
              Your bet:{" "}
              <Text
                className={`font-medium ${userBet.side === "CREATOR" ? "text-primary" : "text-purple-400"
                  }`}
              >
                {userBet.amountSol} SOL on {userBet.side}
              </Text>
            </Text>
          </View>
        )}
      </Card>

      {/* ── ACTIONS ─────────────────────────────────── */}
      <View className="gap-3 mb-4">

        {/* Share invite (owner or opponent, active/initialized) */}
        {isParticipant &&
          (challenge.status === "ACTIVE" || challenge.status === "INITIALIZED") &&
          challenge.inviteToken && (
            <Card>
              <View className="flex-row items-center gap-2 mb-2">
                <Share2 size={14} color="#a855f6" />
                <Text className="text-purple-400 font-medium text-sm">
                  Share Challenge
                </Text>
              </View>
              <Text className="text-zinc-400 text-xs mb-3">
                {hasOpponent
                  ? "Duel is on! Share for friends to bet on who wins."
                  : "Send to a friend to start the duel."}
              </Text>
              <Button variant="secondary" onPress={handleShare}>
                Share Invite Link
              </Button>
            </Card>
          )}

        {/* Register on-chain (owner, no contract ID) */}
        {isOwner &&
          (challenge.status === "ACTIVE" || challenge.status === "INITIALIZED") &&
          !challenge.contractChallengeId && (
            <Card>
              <View className="flex-row items-center gap-2 mb-2">
                <Wallet size={14} color="#3b82f6" />
                <Text className="text-blue-400 font-medium text-sm">
                  Register On-Chain
                </Text>
              </View>
              <Text className="text-zinc-400 text-xs mb-3">
                Register on Solana to enable betting. Stakes 0.02 SOL.
              </Text>
              <Button onPress={handleRegisterOnChain} loading={registering}>
                {registering ? "Approve in wallet..." : "Register (0.02 SOL)"}
              </Button>
            </Card>
          )}

        {/* Join duel (non-owner, initialized, no opponent, has invite) */}
        {!isOwner &&
          !isOpponent &&
          challenge.status === "INITIALIZED" &&
          !hasOpponent &&
          challenge.contractChallengeId &&
          hasValidInvite && (
            <Card>
              <View className="flex-row items-center gap-2 mb-2">
                <Swords size={14} color="#a855f6" />
                <Text className="text-purple-400 font-medium text-sm">
                  You've been challenged!
                </Text>
              </View>
              <Text className="text-zinc-400 text-xs mb-3">
                Accept the duel by staking 0.02 SOL. May the fittest win.
              </Text>
              <Button onPress={handleJoinDuel} loading={joining}>
                {joining ? "Approve in wallet..." : "Accept Duel (0.02 SOL)"}
              </Button>
            </Card>
          )}

        {/* Place bet (non-participant, active, has invite, no existing bet) */}
        {!isParticipant &&
          challenge.status === "ACTIVE" &&
          !pastDeadline &&
          challenge.contractChallengeId &&
          hasValidInvite &&
          !userBet && (
            <Button onPress={() => setBetSheetOpen(true)}>
              Place a Bet
            </Button>
          )}

        {/* Private — no invite */}
        {!isParticipant && !hasValidInvite && !userBet && (
          <Card className="items-center py-4">
            <Lock size={18} color="#71717a" />
            <Text className="text-zinc-400 text-sm mt-2 text-center">
              Private challenge — ask the creator for an invite link.
            </Text>
          </Card>
        )}



        {/* Resolve (owner, active, past deadline, on-chain) */}
        {isOwner &&
          challenge.status === "ACTIVE" &&
          pastDeadline &&
          challenge.contractChallengeId && (
            <Card>
              <Text className="text-white font-medium mb-1">Report Outcome</Text>
              <Text className="text-zinc-400 text-xs mb-3">
                Deadline passed. Who won the duel?
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button onPress={() => handleResolve("CREATOR")} loading={resolving}>
                    I Won!
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    variant="secondary"
                    onPress={() => handleResolve("OPPONENT")}
                    loading={resolving}
                  >
                    They Won
                  </Button>
                </View>
              </View>
            </Card>
          )}

        {/* Claim winnings */}
        {(challenge.status === "COMPLETED" || challenge.status === "RESOLVED") &&
          challenge.contractChallengeId &&
          userBet && (
            <Button onPress={handleClaim} loading={claiming}>
              {claiming ? "Approve in wallet..." : "Claim Winnings"}
            </Button>
          )}

        {/* Resolved banner */}
        {challenge.status === "RESOLVED" && (
          <Card className="items-center py-4 border-primary/20 bg-primary/5">
            <CheckCircle size={22} color="#00FF87" />
            <Text className="text-primary font-medium mt-2">
              Challenge Resolved
            </Text>
          </Card>
        )}

        {/* Waiting for opponent */}
        {isOwner && challenge.status === "INITIALIZED" && !hasOpponent && (
          <Card className="items-center py-4">
            <Text className="text-zinc-400 text-sm text-center">
              Waiting for an opponent... Share the invite link!
            </Text>
          </Card>
        )}
      </View>

      {/* Bettors list */}
      {challenge.bets && challenge.bets.length > 0 && (
        <Card className="mb-4">
          <Text className="text-zinc-400 text-sm font-medium mb-3">
            Participants ({challenge.bets.length})
          </Text>
          {challenge.bets.map((bet) => (
            <View
              key={bet.id}
              className="flex-row items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
            >
              <View className="flex-row items-center gap-2">
                <View className="w-6 h-6 rounded-full bg-primary/20 items-center justify-center">
                  <Text className="text-primary text-[10px] font-bold">
                    {(bet.user?.name || "A")[0].toUpperCase()}
                  </Text>
                </View>
                <Text className="text-zinc-300 text-sm">
                  {bet.user?.name || `${bet.user?.walletAddress?.slice(0, 4)}...`}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-white text-sm font-medium">
                  {bet.amountSol} SOL
                </Text>
                <Text
                  className={`text-xs font-medium ${bet.side === "CREATOR" ? "text-primary" : "text-purple-400"
                    }`}
                >
                  {bet.side}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Bet Sheet */}
      {challenge.contractChallengeId && inviteToken && (
        <PlaceBetSheet
          visible={betSheetOpen}
          onClose={() => setBetSheetOpen(false)}
          challengeId={challenge.id}
          contractChallengeId={challenge.contractChallengeId}
          challengeTitle={challenge.title}
          inviteToken={inviteToken}
          onSuccess={() => fetchData()}
        />
      )}
    </ScrollView>
  );
}