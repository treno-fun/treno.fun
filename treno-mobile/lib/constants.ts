// lib/constants.ts

// ⚠️  CHANGE THIS to your deployed Vercel URL.
// Example: "https://treno-fun.vercel.app"
//
// If testing against a local Next.js dev server on your computer:
//   - Android emulator: use "http://10.0.2.2:3000" (NOT localhost)
//   - Real device on same WiFi: use "http://YOUR_PC_IP:3000"
//   - Vercel deployment: use "https://your-project.vercel.app"
export const API_URL = "http://192.168.29.75:3000";

// Solana Mobile Wallet Adapter app identity
// Phantom displays this when prompting the user to approve connection
export const APP_IDENTITY = {
  name: "treno.fun",
  uri: "https://treno.fun",
  icon: "favicon.ico",
};

// Solana cluster — use devnet for testing
export const SOLANA_CLUSTER = "solana:devnet";
export const SOLANA_RPC_URL = "https://devnet.helius-rpc.com/?api-key=696c0d56-a2e2-4a86-8c5d-22174af9ec3f";