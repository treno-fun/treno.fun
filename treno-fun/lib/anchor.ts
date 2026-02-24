// lib/anchor.ts
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
// import trenoIdl from "./treno.json"; // Your copied IDL

const trenoIdl =
{
  "address": "7aEwhb6UGP9btKmfEwXpTVSjGngUsdmiMA2vVtoFwnVz",
  "metadata": {
    "address": "7aEwhb6UGP9btKmfEwXpTVSjGngUsdmiMA2vVtoFwnVz"
  },
  "version": "0.1.0",
  "name": "treno",
  "instructions": [
    {
      "name": "initializeChallenge",
      "accounts": [
        { "name": "challenge", "isMut": true, "isSigner": false },
        { "name": "creator", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "challengeId", "type": "string" },
        { "name": "goalId", "type": { "array": ["u8", 32] } },
        { "name": "stakeAmount", "type": "u64" },
        { "name": "deadline", "type": "i64" }
      ]
    },
    {
      "name": "joinChallenge",
      "accounts": [
        { "name": "challenge", "isMut": true, "isSigner": false },
        { "name": "opponent", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "placeBet",
      "accounts": [
        { "name": "challenge", "isMut": true, "isSigner": false },
        { "name": "betEntry", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "side", "type": { "defined": "BetSide" } },
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "resolveChallenge",
      "accounts": [
        { "name": "challenge", "isMut": true, "isSigner": false },
        { "name": "creator", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "winner", "type": { "defined": "Winner" } }]
    },
    {
      "name": "claim",
      "accounts": [
        { "name": "challenge", "isMut": true, "isSigner": false },
        { "name": "betEntry", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": true }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Challenge",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "creator", "type": "publicKey" },
          { "name": "opponent", "type": { "option": "publicKey" } },
          { "name": "challengeId", "type": "string" },
          { "name": "goalId", "type": { "array": ["u8", 32] } },
          { "name": "stakeAmount", "type": "u64" },
          { "name": "deadline", "type": "i64" },
          { "name": "status", "type": { "defined": "ChallengeStatus" } },
          { "name": "totalPoolCreator", "type": "u64" },
          { "name": "totalPoolOpponent", "type": "u64" },
          { "name": "winner", "type": { "option": { "defined": "Winner" } } },
          { "name": "protocolFeeBps", "type": "u16" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "BetEntry",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "user", "type": "publicKey" },
          { "name": "amount", "type": "u64" },
          { "name": "side", "type": { "defined": "BetSide" } },
          { "name": "claimed", "type": "bool" }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ChallengeStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "WaitingForOpponent" },
          { "name": "Active" },
          { "name": "Resolved" }
        ]
      }
    },
    {
      "name": "BetSide",
      "type": {
        "kind": "enum",
        "variants": [{ "name": "Creator" }, { "name": "Opponent" }]
      }
    },
    {
      "name": "Winner",
      "type": {
        "kind": "enum",
        "variants": [{ "name": "Creator" }, { "name": "Opponent" }]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ChallengeNotJoinable",
      "msg": "Challenge is not joinable."
    },
    { "code": 6001, "name": "CannotDuelSelf", "msg": "Cannot duel yourself." },
    {
      "code": 6002,
      "name": "ChallengeNotActive",
      "msg": "Challenge is not active."
    },
    { "code": 6003, "name": "DeadlinePassed", "msg": "Deadline passed." },
    { "code": 6004, "name": "NotResolved", "msg": "Not resolved." },
    { "code": 6005, "name": "AlreadyClaimed", "msg": "Already claimed." },
    { "code": 6006, "name": "UserDidNotWin", "msg": "User did not win." }
  ]
}



export const PROGRAM_ID = new PublicKey("7aEwhb6UGP9btKmfEwXpTVSjGngUsdmiMA2vVtoFwnVz");

export function getProgram(provider: AnchorProvider) {
  return new Program(trenoIdl as unknown as Idl, PROGRAM_ID, provider);
}