// polyfills.ts
// MUST be imported FIRST in app/_layout.tsx before any Solana code.
// Sets up Node.js globals that @solana/web3.js and Anchor need.

// 1. crypto.getRandomValues — needed for keypair generation
import "react-native-get-random-values";

// 2. Buffer — used everywhere in Solana for byte manipulation
import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

// 3. TextEncoder / TextDecoder — needed for message signing
// React Native doesn't include these by default.
if (typeof global.TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const encoding = require("text-encoding");
  global.TextEncoder = encoding.TextEncoder;
  global.TextDecoder = encoding.TextDecoder;
}

// 4. btoa / atob — some Solana libraries use these
if (typeof global.btoa === "undefined") {
  global.btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
  global.atob = (b64: string) => Buffer.from(b64, "base64").toString("binary");
}