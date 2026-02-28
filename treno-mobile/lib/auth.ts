// lib/auth.ts
// Handles JWT token storage and the MWA wallet sign-in flow.
// Works with Phantom, Solflare, and any MWA-compliant wallet.
//
// IMPORTANT: MWA returns the wallet address as base64-encoded public key bytes.
// Our backend expects a standard base58 Solana address.
// This file handles that conversion.

import * as SecureStore from "expo-secure-store";
import bs58 from "bs58";
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { API_URL, APP_IDENTITY, SOLANA_CLUSTER } from "./constants";

const TOKEN_KEY = "treno_jwt";
const WALLET_KEY = "treno_wallet";
const AUTH_TOKEN_KEY = "treno_mwa_auth_token";

// ── Token Storage ──────────────────────────────────────

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(WALLET_KEY);
  } catch {
    return null;
  }
}

export async function setWalletAddress(address: string): Promise<void> {
  await SecureStore.setItemAsync(WALLET_KEY, address);
}

export async function getMwaAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setMwaAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => { });
  await SecureStore.deleteItemAsync(WALLET_KEY).catch(() => { });
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => { });
}

// ── Address Format Helpers ─────────────────────────────

/**
 * Convert an MWA address to a standard base58 Solana address.
 *
 * MWA wallets (Phantom, Solflare) return the address as a base64-encoded
 * representation of the 32-byte public key. Our backend expects base58.
 *
 * This function detects the format and converts if needed.
 */
function toBase58Address(mwaAddress: string): string {
  // Check if it's already a valid base58 Solana address.
  // Base58 chars don't include +, /, or = (which base64 uses).
  const hasBase64Chars = /[+/=]/.test(mwaAddress);

  if (!hasBase64Chars) {
    try {
      const decoded = bs58.decode(mwaAddress);
      if (decoded.length === 32) {
        // Already a valid base58 public key
        return mwaAddress;
      }
    } catch {
      // Not valid base58, fall through to base64 decode
    }
  }

  // Decode as base64 → bytes → re-encode as base58
  try {
    const bytes = Buffer.from(mwaAddress, "base64");
    if (bytes.length === 32) {
      return bs58.encode(bytes);
    }
    throw new Error(`Unexpected key length: ${bytes.length} bytes`);
  } catch (e: any) {
    console.warn("[Auth] Address conversion warning:", e.message);
    // Return as-is and let backend handle it
    return mwaAddress;
  }
}

// ── MWA Connect + Sign-in ──────────────────────────────

export interface SignInResult {
  token: string;
  user: {
    id: string;
    name: string | null;
    walletAddress: string | null;
  };
}

/**
 * Full sign-in flow:
 * 1. Open MWA session with wallet app
 * 2. Authorize — get wallet address
 * 3. Sign a login message
 * 4. Send to backend → receive JWT
 * 5. Store JWT and wallet address
 */
export async function signInWithWallet(): Promise<SignInResult> {
  const storedAuthToken = await getMwaAuthToken();

  console.log("[Auth] Starting MWA sign-in...");

  // ── Steps 1-3: MWA session ──────────────────────────
  const mwaResult = await transact(async (wallet: Web3MobileWallet) => {
    console.log("[Auth] MWA session opened, requesting authorization...");

    const authResult = await wallet.authorize({
      cluster: SOLANA_CLUSTER,
      identity: APP_IDENTITY,
      auth_token: storedAuthToken ?? undefined,
    });

    // Raw address from MWA (may be base64 or base58)
    const rawAddress = authResult.accounts[0].address;
    console.log("[Auth] Raw MWA address:", rawAddress);
    console.log("[Auth] Address length:", rawAddress.length);

    // Convert to standard base58
    const base58Address = toBase58Address(rawAddress);
    console.log("[Auth] Base58 address:", base58Address);

    // Store MWA reauth token
    if (authResult.auth_token) {
      await setMwaAuthToken(authResult.auth_token);
    }

    // Build the login message using the BASE58 address
    const timestamp = Date.now();
    const message = `Sign in to treno.fun\n\nAddress: ${base58Address}\nTimestamp: ${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);

    console.log("[Auth] Requesting signature from wallet...");

    // Sign the message.
    // IMPORTANT: pass the ORIGINAL rawAddress from MWA, not our converted one.
    // The wallet identifies accounts by the address format it returned.
    const signedMessages = await wallet.signMessages({
      addresses: [rawAddress],
      payloads: [messageBytes],
    });

    console.log("[Auth] Message signed!");

    return {
      base58Address,
      message,
      signatureBytes: new Uint8Array(signedMessages[0]),
    };
  });

  // ── Step 4: Authenticate with backend ───────────────
  const signature = bs58.encode(mwaResult.signatureBytes);

  console.log("[Auth] Sending to backend...");
  console.log("[Auth] URL:", `${API_URL}/api/auth/mobile`);

  const res = await fetch(`${API_URL}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: mwaResult.base58Address,
      message: mwaResult.message,
      signature,
    }),
  });

  const responseText = await res.text();
  console.log("[Auth] Response:", res.status, responseText.slice(0, 300));

  if (!res.ok) {
    let errorMsg = "Authentication failed";
    try {
      const errBody = JSON.parse(responseText);
      errorMsg = errBody.error || errorMsg;
    } catch {
      errorMsg = responseText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  const data: SignInResult = JSON.parse(responseText);

  // ── Step 5: Store credentials ───────────────────────
  await setToken(data.token);
  await setWalletAddress(mwaResult.base58Address);

  console.log("[Auth] Signed in as:", data.user.id);
  return data;
}