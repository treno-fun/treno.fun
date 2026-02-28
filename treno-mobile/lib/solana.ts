// lib/solana.ts
// Solana on-chain transaction helpers using MWA.
//
// KEY FIX: All transaction building happens BEFORE opening the MWA session.
// Inside transact(), we ONLY authorize + signAndSendTransactions.
// This ensures Phantom always receives a valid transaction to display.
//
// Pattern:
// 1. Get wallet address from SecureStore (already stored from login)
// 2. Fetch blockhash from RPC
// 3. Build complete VersionedTransaction
// 4. Open MWA → authorize → signAndSendTransactions
// 5. Wait for confirmation

import {
    Connection,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
    TransactionInstruction,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
    transact,
    Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import bs58 from "bs58";
import { SOLANA_RPC_URL, SOLANA_CLUSTER, APP_IDENTITY } from "./constants";
import { getMwaAuthToken, setMwaAuthToken, getWalletAddress } from "./auth";

// ── Program setup ──────────────────────────────────────

const PROGRAM_ID = new PublicKey(
    "7aEwhb6UGP9btKmfEwXpTVSjGngUsdmiMA2vVtoFwnVz"
);

// Minimal IDL — only what we need for instruction building
const TRENO_IDL = {
    version: "0.1.0",
    name: "treno",
    instructions: [
        {
            name: "initializeChallenge",
            accounts: [
                { name: "challenge", isMut: true, isSigner: false },
                { name: "creator", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "challengeId", type: "string" },
                { name: "goalId", type: { array: ["u8", 32] } },
                { name: "stakeAmount", type: "u64" },
                { name: "deadline", type: "i64" },
            ],
        },
        {
            name: "joinChallenge",
            accounts: [
                { name: "challenge", isMut: true, isSigner: false },
                { name: "opponent", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [],
        },
        {
            name: "placeBet",
            accounts: [
                { name: "challenge", isMut: true, isSigner: false },
                { name: "betEntry", isMut: true, isSigner: false },
                { name: "user", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "side", type: { defined: "BetSide" } },
                { name: "amount", type: "u64" },
            ],
        },
        {
            name: "resolveChallenge",
            accounts: [
                { name: "challenge", isMut: true, isSigner: false },
                { name: "creator", isMut: false, isSigner: true },
            ],
            args: [{ name: "winner", type: { defined: "Winner" } }],
        },
        {
            name: "claim",
            accounts: [
                { name: "challenge", isMut: true, isSigner: false },
                { name: "betEntry", isMut: true, isSigner: false },
                { name: "user", isMut: true, isSigner: true },
            ],
            args: [],
        },
    ],
    accounts: [
        {
            name: "Challenge",
            type: {
                kind: "struct",
                fields: [
                    { name: "creator", type: "publicKey" },
                    { name: "opponent", type: { option: "publicKey" } },
                    { name: "challengeId", type: "string" },
                    { name: "goalId", type: { array: ["u8", 32] } },
                    { name: "stakeAmount", type: "u64" },
                    { name: "deadline", type: "i64" },
                    { name: "status", type: { defined: "ChallengeStatus" } },
                    { name: "totalPoolCreator", type: "u64" },
                    { name: "totalPoolOpponent", type: "u64" },
                    { name: "winner", type: { option: { defined: "Winner" } } },
                    { name: "protocolFeeBps", type: "u16" },
                    { name: "bump", type: "u8" },
                ],
            },
        },
        {
            name: "BetEntry",
            type: {
                kind: "struct",
                fields: [
                    { name: "user", type: "publicKey" },
                    { name: "amount", type: "u64" },
                    { name: "side", type: { defined: "BetSide" } },
                    { name: "claimed", type: "bool" },
                ],
            },
        },
    ],
    types: [
        {
            name: "ChallengeStatus",
            type: {
                kind: "enum",
                variants: [
                    { name: "WaitingForOpponent" },
                    { name: "Active" },
                    { name: "Resolved" },
                ],
            },
        },
        {
            name: "BetSide",
            type: {
                kind: "enum",
                variants: [{ name: "Creator" }, { name: "Opponent" }],
            },
        },
        {
            name: "Winner",
            type: {
                kind: "enum",
                variants: [{ name: "Creator" }, { name: "Opponent" }],
            },
        },
    ],
    errors: [],
};

const connection = new Connection(SOLANA_RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
    fetch: async (url, options) => {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...((options?.headers as Record<string, string>) || {}),
                "Content-Type": "application/json",
            },
        });
        return res;
    },
});
console.log("connection", connection);

// ── Helpers ────────────────────────────────────────────

function toBase58Address(mwaAddress: string): string {
    const hasBase64Chars = /[+/=]/.test(mwaAddress);
    if (!hasBase64Chars) {
        try {
            const decoded = bs58.decode(mwaAddress);
            if (decoded.length === 32) return mwaAddress;
        } catch { }
    }
    try {
        const bytes = Buffer.from(mwaAddress, "base64");
        if (bytes.length === 32) return bs58.encode(bytes);
    } catch { }
    return mwaAddress;
}

/**
 * Get the user's PublicKey from stored wallet address.
 * This lets us build transactions WITHOUT opening MWA first.
 */
async function getStoredPublicKey(): Promise<PublicKey> {
    const addr = await getWalletAddress();
    if (!addr) throw new Error("No wallet connected. Please sign in first.");
    return new PublicKey(addr);
}

/**
 * Get a read-only Anchor program for building instructions.
 */
function getProgram(userPubkey: PublicKey): Program {
    const dummyWallet = {
        publicKey: userPubkey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
    } as unknown as Wallet;

    const provider = new AnchorProvider(connection, dummyWallet, {
        commitment: "confirmed",
    });
    return new Program(TRENO_IDL as any, PROGRAM_ID, provider);
}

/**
 * Build a complete VersionedTransaction from instructions.
 * This is called BEFORE opening MWA.
 */
async function buildTransaction(
    payerKey: PublicKey,
    instructions: TransactionInstruction[]
): Promise<VersionedTransaction> {
    console.log("[Solana] Fetching blockhash...");
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const messageV0 = new TransactionMessage({
        payerKey,
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
}

/**
 * Opens MWA, authorizes, signs + sends a pre-built transaction.
 * Returns the transaction signature as base58.
 *
 * Uses signAndSendTransactions — Phantom handles BOTH signing and broadcasting.
 *
 * IMPORTANT: minContextSlot MUST be provided — without it, Phantom has a known
 * bug where it silently skips the approval dialog and returns to the app.
 */
async function mwaSignAndSend(tx: VersionedTransaction): Promise<string> {
    const storedAuthToken = await getMwaAuthToken();

    // Fetch the current slot BEFORE opening MWA — needed to fix Phantom bug
    console.log("[Solana] Fetching current slot for minContextSlot...");
    const currentSlot = await connection.getSlot("confirmed");
    console.log("[Solana] Current slot:", currentSlot);

    console.log("[Solana] Opening MWA session...");

    const rawSignature = await transact(async (wallet: Web3MobileWallet) => {
        // Step 1: Authorize
        console.log("[Solana] Authorizing...");
        const authResult = await wallet.authorize({
            chain: SOLANA_CLUSTER,
            identity: APP_IDENTITY,
            auth_token: storedAuthToken ?? undefined,
        });

        if (authResult.auth_token) {
            await setMwaAuthToken(authResult.auth_token);
        }

        console.log("[Solana] Authorized. Sending tx for approval + broadcast...");

        // Step 2: Sign AND Send — Phantom shows approval then broadcasts
        // minContextSlot is REQUIRED for Phantom to show the confirm screen
        const signatures = await wallet.signAndSendTransactions({
            transactions: [tx],
            minContextSlot: currentSlot,
        });

        console.log("[Solana] Transaction signed and sent by wallet!");
        return signatures[0];
    });

    // Encode the signature to base58
    const sigBase58 =
        typeof rawSignature === "string"
            ? rawSignature
            : bs58.encode(new Uint8Array(rawSignature));

    console.log("[Solana] Signature:", sigBase58);

    // Wait for confirmation (wrapped in try-catch since tx was already sent)
    console.log("[Solana] Waiting for confirmation...");
    try {
        const latestBlockhash = await connection.getLatestBlockhash("confirmed");
        await connection.confirmTransaction(
            {
                signature: sigBase58,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            "confirmed"
        );
        console.log("[Solana] Confirmed!");
    } catch (confirmErr: any) {
        // Tx was already broadcast by Phantom — confirmation polling might fail
        // but the transaction may still have landed on-chain.
        console.warn("[Solana] Confirmation check failed:", confirmErr.message);
        console.warn("[Solana] Transaction may still have landed. Signature:", sigBase58);
    }

    return sigBase58;
}

// ── Public API ─────────────────────────────────────────

/**
 * Initialize a challenge on-chain. Stakes 0.02 SOL.
 */
export async function initializeChallengeOnChain(params: {
    challengeIdStr: string;
    deadlineUnix: number;
}): Promise<{ txHash: string; contractChallengeId: string }> {
    const { challengeIdStr, deadlineUnix } = params;
    console.log("[Solana] initializeChallenge:", challengeIdStr);

    // 1. Get user pubkey from stored wallet (no MWA needed)
    const userPubkey = await getStoredPublicKey();
    const program = getProgram(userPubkey);

    // 2. Derive PDA
    const [challengePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("challenge"), Buffer.from(challengeIdStr)],
        program.programId
    );

    // 3. Build instruction
    const stakeAmount = new BN(0.02 * 1e9);
    const deadline = new BN(deadlineUnix);
    const goalIdBytes = Array.from(
        globalThis.crypto.getRandomValues(new Uint8Array(32))
    );

    console.log("[Solana] Building instruction...");
    const ix = await program.methods
        .initializeChallenge(challengeIdStr, goalIdBytes, stakeAmount, deadline)
        .accounts({
            challenge: challengePda,
            creator: userPubkey,
            systemProgram: SystemProgram.programId,
        })
        .instruction();

    // 4. Build full transaction
    const tx = await buildTransaction(userPubkey, [ix]);

    // 5. Sign + send via MWA (Phantom only gets a fully built tx)
    const txHash = await mwaSignAndSend(tx);

    return { txHash, contractChallengeId: challengeIdStr };
}

/**
 * Join a challenge as the opponent. Stakes 0.02 SOL.
 */
export async function joinChallengeOnChain(
    contractChallengeId: string
): Promise<string> {
    console.log("[Solana] joinChallenge:", contractChallengeId);

    const userPubkey = await getStoredPublicKey();
    const program = getProgram(userPubkey);

    const [challengePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("challenge"), Buffer.from(contractChallengeId)],
        program.programId
    );

    const ix = await program.methods
        .joinChallenge()
        .accounts({
            challenge: challengePda,
            opponent: userPubkey,
            systemProgram: SystemProgram.programId,
        })
        .instruction();

    const tx = await buildTransaction(userPubkey, [ix]);
    return mwaSignAndSend(tx);
}

/**
 * Place a bet on a challenge.
 */
export async function placeBetOnChain(params: {
    contractChallengeId: string;
    side: "CREATOR" | "OPPONENT";
    amountLamports: number;
}): Promise<string> {
    const { contractChallengeId, side, amountLamports } = params;
    console.log("[Solana] placeBet:", contractChallengeId, side, amountLamports);

    const userPubkey = await getStoredPublicKey();
    console.log("[Solana] placeBet user:", userPubkey.toBase58());
    const program = getProgram(userPubkey);

    const [challengePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("challenge"), Buffer.from(contractChallengeId)],
        program.programId
    );
    console.log("[Solana] placeBet challengePda:", challengePda.toBase58());

    const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), challengePda.toBuffer(), userPubkey.toBuffer()],
        program.programId
    );
    console.log("[Solana] placeBet betPda:", betPda.toBase58());

    const sideArg = side === "CREATOR" ? { creator: {} } : { opponent: {} };
    const amount = new BN(amountLamports);
    console.log("[Solana] placeBet side:", JSON.stringify(sideArg), "amount:", amount.toString());

    console.log("[Solana] Building placeBet instruction...");
    const ix = await program.methods
        .placeBet(sideArg as any, amount)
        .accounts({
            challenge: challengePda,
            betEntry: betPda,
            user: userPubkey,
            systemProgram: SystemProgram.programId,
        })
        .instruction();
    console.log("[Solana] placeBet instruction built. Keys:", ix.keys.map(k => ({
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
    })));

    const tx = await buildTransaction(userPubkey, [ix]);

    // Pre-simulate to catch errors BEFORE sending to Phantom.
    // Phantom silently skips approval when simulation fails.
    console.log("[Solana] Pre-simulating placeBet transaction...");
    try {
        const simResult = await connection.simulateTransaction(tx, {
            sigVerify: false, // skip sig check since tx isn't signed yet
        });
        if (simResult.value.err) {
            console.error("[Solana] placeBet SIMULATION FAILED:", JSON.stringify(simResult.value.err));
            console.error("[Solana] Simulation logs:", simResult.value.logs);
            throw new Error(
                `Transaction will fail on-chain: ${JSON.stringify(simResult.value.err)}\nLogs: ${(simResult.value.logs || []).join("\n")}`
            );
        }
        console.log("[Solana] placeBet simulation OK. Logs:", simResult.value.logs);
    } catch (simErr: any) {
        if (simErr.message?.startsWith("Transaction will fail")) {
            throw simErr; // Re-throw our formatted error
        }
        console.warn("[Solana] Simulation call failed (non-critical):", simErr.message);
        // Network error during simulation — still try sending to Phantom
    }

    return mwaSignAndSend(tx);
}

/**
 * Resolve a challenge (creator only).
 */
export async function resolveChallengeOnChain(params: {
    contractChallengeId: string;
    winner: "CREATOR" | "OPPONENT";
}): Promise<string> {
    const { contractChallengeId, winner } = params;
    console.log("[Solana] resolveChallenge:", contractChallengeId, winner);

    const userPubkey = await getStoredPublicKey();
    const program = getProgram(userPubkey);

    const [challengePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("challenge"), Buffer.from(contractChallengeId)],
        program.programId
    );

    const winnerArg = winner === "CREATOR" ? { creator: {} } : { opponent: {} };

    const ix = await program.methods
        .resolveChallenge(winnerArg as any)
        .accounts({
            challenge: challengePda,
            creator: userPubkey,
        })
        .instruction();

    const tx = await buildTransaction(userPubkey, [ix]);
    return mwaSignAndSend(tx);
}

/**
 * Claim winnings from a resolved challenge.
 */
export async function claimWinningsOnChain(
    contractChallengeId: string
): Promise<string> {
    console.log("[Solana] claim:", contractChallengeId);

    const userPubkey = await getStoredPublicKey();
    const program = getProgram(userPubkey);

    const [challengePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("challenge"), Buffer.from(contractChallengeId)],
        program.programId
    );

    const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), challengePda.toBuffer(), userPubkey.toBuffer()],
        program.programId
    );

    const ix = await program.methods
        .claim()
        .accounts({
            challenge: challengePda,
            betEntry: betPda,
            user: userPubkey,
        })
        .instruction();

    const tx = await buildTransaction(userPubkey, [ix]);
    return mwaSignAndSend(tx);
}