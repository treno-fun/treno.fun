// components/PlaceBetSheet.tsx
// Bottom-sheet-style modal for placing a bet.
// Signs the transaction on-chain via MWA, then persists to backend.

import { useState } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Button } from "../ui";
import { placeBetOnChain } from "../../lib/solana";
import { placeBet as persistBet } from "../../lib/api";
import { TrendingUp, Swords, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface PlaceBetSheetProps {
    visible: boolean;
    onClose: () => void;
    challengeId: string;
    contractChallengeId: string;
    challengeTitle: string;
    inviteToken: string;
    onSuccess: () => void;
}

export function PlaceBetSheet({
    visible,
    onClose,
    challengeId,
    contractChallengeId,
    challengeTitle,
    inviteToken,
    onSuccess,
}: PlaceBetSheetProps) {
    const [side, setSide] = useState<"CREATOR" | "OPPONENT">("CREATOR");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    async function handlePlaceBet() {
        const solAmount = parseFloat(amount);
        if (!solAmount || solAmount <= 0) {
            return Alert.alert("Error", "Enter a valid SOL amount");
        }

        setLoading(true);
        setStatus("Approve in wallet...");
        try {
            // 1. On-chain transaction via MWA
            const lamports = Math.round(solAmount * 1e9);
            const txHash = await placeBetOnChain({
                contractChallengeId,
                side,
                amountLamports: lamports,
            });

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStatus("Saving bet...");

            // 2. Persist to backend
            await persistBet({
                challengeId,
                side,
                amountSol: amount,
                amountLamports: lamports.toString(),
                txHash,
                inviteToken,
            });

            setStatus(null);
            onSuccess();
            handleClose();
        } catch (err: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setStatus(null);
            const msg = err?.message || "Transaction failed";
            if (msg.includes("User rejected")) {
                Alert.alert("Cancelled", "Transaction was cancelled.");
            } else {
                Alert.alert("Error", msg);
            }
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        setAmount("");
        setSide("CREATOR");
        setStatus(null);
        onClose();
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 justify-end"
            >
                {/* Backdrop */}
                <TouchableOpacity
                    className="flex-1 bg-black/60"
                    activeOpacity={1}
                    onPress={handleClose}
                />

                {/* Sheet */}
                <View className="bg-surface border-t border-white/[0.08] rounded-t-3xl px-5 pt-5 pb-8">
                    {/* Handle + close */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-white text-lg font-semibold">Place a Bet</Text>
                        <TouchableOpacity onPress={handleClose} className="p-1">
                            <X size={20} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-zinc-400 text-sm mb-4" numberOfLines={1}>
                        Betting on: "{challengeTitle}"
                    </Text>

                    {/* Side selector */}
                    <Text className="text-zinc-300 text-sm font-medium mb-2">
                        Who will win?
                    </Text>
                    <View className="flex-row gap-3 mb-4">
                        <TouchableOpacity
                            onPress={() => setSide("CREATOR")}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border ${side === "CREATOR"
                                ? "bg-primary/10 border-primary/30"
                                : "border-white/[0.06]"
                                }`}
                        >
                            <TrendingUp
                                size={16}
                                color={side === "CREATOR" ? "#00FF87" : "#71717a"}
                            />
                            <Text
                                className={`text-sm font-medium ${side === "CREATOR" ? "text-primary" : "text-zinc-400"
                                    }`}
                            >
                                Creator
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setSide("OPPONENT")}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border ${side === "OPPONENT"
                                ? "bg-purple-500/10 border-purple-500/30"
                                : "border-white/[0.06]"
                                }`}
                        >
                            <Swords
                                size={16}
                                color={side === "OPPONENT" ? "#a855f6" : "#71717a"}
                            />
                            <Text
                                className={`text-sm font-medium ${side === "OPPONENT" ? "text-purple-400" : "text-zinc-400"
                                    }`}
                            >
                                Opponent
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount input */}
                    <Text className="text-zinc-300 text-sm font-medium mb-1.5">
                        Amount (SOL)
                    </Text>
                    <TextInput
                        className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm mb-4"
                        placeholder="0.1"
                        placeholderTextColor="#52525b"
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    {/* Status */}
                    {status && (
                        <View className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 mb-3">
                            <Text className="text-yellow-400 text-xs text-center">
                                {status}
                            </Text>
                        </View>
                    )}

                    {/* Submit */}
                    <Button onPress={handlePlaceBet} loading={loading}>
                        {loading
                            ? "Processing..."
                            : `Bet ${amount || "0"} SOL on ${side === "CREATOR" ? "Creator" : "Opponent"}`}
                    </Button>

                    <Text className="text-zinc-600 text-xs text-center mt-3">
                        Solana Devnet · 2% protocol fee on winnings
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}