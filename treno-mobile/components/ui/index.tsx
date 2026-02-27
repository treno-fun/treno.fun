// components/ui/index.tsx
// Reusable UI components for the mobile app.
// Styled to match the web app's dark theme with green accent.

import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
  type ViewProps,
} from "react-native";

// ── Button ─────────────────────────────────────────────

interface ButtonProps extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const base = "flex-row items-center justify-center rounded-xl px-5 py-3 gap-2";
  const variants = {
    primary: "bg-primary/10 border border-primary/30",
    secondary: "bg-white/5 border border-white/10",
    ghost: "bg-transparent",
    danger: "bg-red-500/10 border border-red-500/20",
  };
  const textVariants = {
    primary: "text-primary",
    secondary: "text-white",
    ghost: "text-zinc-400",
    danger: "text-red-400",
  };

  return (
    <TouchableOpacity
      className={`${base} ${variants[variant]} ${disabled || loading ? "opacity-50" : ""} ${className || ""}`}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color="#00FF87" />}
      <Text className={`font-semibold text-sm ${textVariants[variant]}`}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// ── Card ───────────────────────────────────────────────

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`bg-surface rounded-2xl border border-white/[0.06] p-4 ${className || ""}`}
      {...props}
    >
      {children}
    </View>
  );
}

// ── Badge ──────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-white/[0.06] border-white/[0.06]",
    success: "bg-primary/10 border-primary/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    danger: "bg-red-500/10 border-red-500/20",
    info: "bg-blue-500/10 border-blue-500/20",
  };
  const textVariants = {
    default: "text-zinc-300",
    success: "text-primary",
    warning: "text-yellow-400",
    danger: "text-red-400",
    info: "text-blue-400",
  };

  return (
    <View className={`rounded-full px-2.5 py-0.5 border ${variants[variant]}`}>
      <Text className={`text-xs font-medium ${textVariants[variant]}`}>
        {children}
      </Text>
    </View>
  );
}

// ── Progress Bar ───────────────────────────────────────

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "bg-primary",
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <View className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
      <View
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}

// ── Section Header ─────────────────────────────────────

export function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-white font-semibold text-base">{title}</Text>
      {right}
    </View>
  );
}

// ── Empty State ────────────────────────────────────────

export function EmptyState({
  icon,
  message,
  action,
}: {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="items-center py-8 border-dashed">
      {icon && <View className="mb-3">{icon}</View>}
      <Text className="text-zinc-400 text-sm text-center mb-4">{message}</Text>
      {action}
    </Card>
  );
}

// ── Loading Screen ─────────────────────────────────────

export function LoadingScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#00FF87" />
    </View>
  );
}
