import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { CheckCircle, Circle } from "lucide-react-native";
import { Button } from "../ui";
import { getCheckIns, checkIn as apiCheckIn } from "../../lib/api";
import { type CheckIn } from "../../lib/types";
import * as Haptics from "expo-haptics";

interface CheckInCalendarProps {
    challengeId: string;
    startDate: string;
    endDate: string;
    isParticipant: boolean;
    onCheckInSuccess: () => void;
}

function getDaysInRange(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const cur = new Date(start);
    cur.setUTCHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setUTCHours(0, 0, 0, 0);
    while (cur <= endNorm) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate()
    );
}

function toDateKey(d: Date): string {
    return d.toISOString().split("T")[0];
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CheckInCalendar({
    challengeId,
    startDate,
    endDate,
    isParticipant,
    onCheckInSuccess,
}: CheckInCalendarProps) {
    const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);

    const fetchCheckIns = useCallback(async () => {
        try {
            const data = await getCheckIns(challengeId);
            setCheckIns(data);
        } catch (err: any) {
            console.error("[CheckInCalendar] Error fetching check-ins:", err.message);
        } finally {
            setLoading(false);
        }
    }, [challengeId]);

    useEffect(() => {
        fetchCheckIns();
    }, [fetchCheckIns]);

    const checkedDates = new Set(
        checkIns.map((c) => toDateKey(new Date(c.date)))
    );

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayKey = toDateKey(today);
    const isCheckedInToday = checkedDates.has(todayKey);

    const startD = new Date(startDate);
    startD.setUTCHours(0, 0, 0, 0);
    const endD = new Date(endDate);
    endD.setUTCHours(23, 59, 59, 999);

    const isTodayInRange = today >= startD && today <= endD;

    async function handleCheckIn() {
        setCheckingIn(true);
        try {
            await apiCheckIn(challengeId);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await fetchCheckIns();
            onCheckInSuccess();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Check-in failed");
        } finally {
            setCheckingIn(false);
        }
    }

    const allDays = getDaysInRange(new Date(startDate), new Date(endDate));
    const totalDays = allDays.length;
    const checkedCount = checkIns.length;

    const months = new Map<string, Date[]>();
    for (const d of allDays) {
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
        if (!months.has(key)) months.set(key, []);
        months.get(key)!.push(d);
    }

    if (loading) {
        return (
            <View className="items-center justify-center py-8">
                <ActivityIndicator color="#a1a1aa" />
                <Text className="text-zinc-500 mt-2 text-sm">Loading calendar...</Text>
            </View>
        );
    }

    return (
        <View className="gap-4">
            {/* Stats bar */}
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-end gap-2">
                    <Text className="text-2xl font-bold text-white">{checkedCount}</Text>
                    <Text className="text-zinc-400 text-sm mb-1">/ {totalDays} days checked in</Text>
                </View>
            </View>

            <View className="flex-row flex-wrap gap-x-4 gap-y-2 text-xs">
                <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-sm bg-[#00FF87]/60" />
                    <Text className="text-zinc-500 text-xs">Checked in</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-sm bg-orange-500/60" />
                    <Text className="text-zinc-500 text-xs">Strava</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 border border-red-500/30 rounded-sm bg-red-500/40" />
                    <Text className="text-zinc-500 text-xs">Missed</Text>
                </View>
            </View>

            {/* Progress bar */}
            <View className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <View
                    className="h-full bg-primary rounded-full absolute"
                    style={{ width: `${totalDays > 0 ? (checkedCount / totalDays) * 100 : 0}%` }}
                />
            </View>

            {/* Calendar grids by month */}
            {Array.from(months.entries()).map(([key, days]) => {
                const firstDay = days[0];
                const monthName = MONTH_NAMES[firstDay.getUTCMonth()];
                const year = firstDay.getUTCFullYear();
                const firstDayOfMonth = new Date(Date.UTC(year, firstDay.getUTCMonth(), 1));
                const startOffset = firstDayOfMonth.getUTCDay();
                const daysInMonth = new Date(Date.UTC(year, firstDay.getUTCMonth() + 1, 0)).getUTCDate();

                return (
                    <View key={key} className="mt-2">
                        <Text className="text-zinc-300 text-sm font-medium mb-3">
                            {monthName} {year}
                        </Text>

                        {/* Days header */}
                        <View className="flex-row justify-between mb-2">
                            {DAY_LABELS.map((d) => (
                                <Text key={d} className="text-center text-[10px] text-zinc-600 flex-1">
                                    {d}
                                </Text>
                            ))}
                        </View>

                        {/* Grid */}
                        <View className="flex-row flex-wrap">
                            {/* Empty offset days */}
                            {Array.from({ length: startOffset }).map((_, i) => (
                                <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} className="p-0.5" />
                            ))}

                            {/* Actual days */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = new Date(Date.UTC(year, firstDay.getUTCMonth(), i + 1));
                                const dayKey = toDateKey(day);
                                const isInRange = allDays.some((d) => isSameDay(d, day));
                                const isToday = isSameDay(day, today);
                                const checkIn = checkIns.find(
                                    (c) => toDateKey(new Date(c.date)) === dayKey
                                );
                                const isChecked = !!checkIn;
                                const isStrava = checkIn?.source === "STRAVA";
                                const isPast = day < today;
                                const isMissed = isInRange && !isChecked && isPast;

                                let containerClass = "flex-1 items-center justify-center rounded-lg ";
                                let textClass = "text-xs font-medium ";

                                if (!isInRange) {
                                    textClass += "text-zinc-700";
                                } else if (isChecked && isStrava) {
                                    containerClass += "bg-orange-500/15 border border-orange-500/20";
                                    textClass += "text-orange-400";
                                } else if (isChecked && !isStrava) {
                                    containerClass += "bg-[#00FF87]/15 border border-[#00FF87]/20";
                                    textClass += "text-[#00FF87]";
                                } else if (isMissed) {
                                    containerClass += "bg-red-500/10 border border-red-500/20";
                                    textClass += "text-red-500";
                                } else if (!isPast) {
                                    containerClass += "bg-white/[0.02]";
                                    textClass += "text-zinc-400";
                                }

                                if (isToday) {
                                    containerClass += " border border-[#00FF87]/30";
                                } else if (!isChecked && !isMissed && isInRange) {
                                    containerClass += " border border-transparent";
                                }

                                return (
                                    <View key={dayKey} style={{ width: '14.28%', aspectRatio: 1 }} className="p-0.5">
                                        <View className={containerClass} style={{ width: '100%', height: '100%' }}>
                                            <Text className={textClass}>{i + 1}</Text>
                                            {isInRange && isChecked && (
                                                <View className="absolute top-0.5 right-0.5">
                                                    <CheckCircle size={8} color={isStrava ? "#fb923c" : "#00FF87"} />
                                                </View>
                                            )}
                                            {isMissed && (
                                                <View className="absolute top-0.5 right-0.5">
                                                    <Circle size={8} color="#ef4444" opacity={0.4} />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                );
            })}

            {/* Check-in button */}
            {isParticipant && isTodayInRange && (
                <View className="mt-2">
                    {isCheckedInToday ? (
                        <View className="bg-[#00FF87]/10 border border-[#00FF87]/20 rounded-xl py-3 flex-row items-center justify-center gap-2">
                            <CheckCircle size={16} color="#00FF87" />
                            <Text className="text-[#00FF87] font-semibold text-sm">Checked in today ✓</Text>
                        </View>
                    ) : (
                        <Button
                            onPress={handleCheckIn}
                            loading={checkingIn}
                        >
                            Check In for Today
                        </Button>
                    )}
                </View>
            )}
        </View>
    );
}
