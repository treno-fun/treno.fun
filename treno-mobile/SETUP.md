# PHASE 2 — Mobile Project Setup Guide

## Step-by-step instructions

### 1. Create the project
```bash
npx create-expo-app@latest treno-mobile --template blank-typescript
cd treno-mobile
```

### 2. Install ALL dependencies (run each group)
```bash
# Core Expo packages
npx expo install expo-router expo-linking expo-constants expo-status-bar expo-dev-client expo-splash-screen

# Auth & storage
npx expo install expo-secure-store expo-crypto

# Mobile UX features
npx expo install expo-haptics expo-local-authentication

# Clipboard
npx expo install expo-clipboard

# NativeWind (Tailwind for RN)
npx expo install nativewind tailwindcss@3.3.2

# Navigation (required by expo-router)
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated

# Solana core
npm install @solana/web3.js@1 @coral-xyz/anchor@0.29.0 bs58

# Solana Mobile Wallet Adapter
npm install @solana-mobile/mobile-wallet-adapter-protocol-web3js @solana-mobile/mobile-wallet-adapter-protocol

# Polyfills for Solana in React Native
npm install react-native-get-random-values buffer text-encoding

# Icons
npm install lucide-react-native
npx expo install react-native-svg

# Utilities
npm install react-native-quick-base64
```

### 3. Update package.json

Open `package.json` and change the `"main"` field:
```json
"main": "expo-router/entry"
```

### 4. Copy files from the zip

Extract `phase2-mobile-project.zip` and copy everything into your `treno-mobile/` directory.
This will create/overwrite:
- `app.json` (Expo config)
- `babel.config.js`
- `metro.config.js`
- `tailwind.config.js`
- `tsconfig.json`
- `global.css`
- `nativewind-env.d.ts`
- `polyfills.ts`
- `lib/` (constants, types, api client, auth)
- `providers/` (auth provider)
- `components/ui/` (reusable components)
- `app/` (all screens and layouts)

### 5. Update your API URL

Open `lib/constants.ts` and change:
```ts
export const API_URL = "https://your-actual-vercel-domain.vercel.app";
```

### 6. Build and run

Since we use native modules (MWA, SecureStore), we CANNOT use Expo Go.
We need a development build:

```bash
# Generate Android native project
npx expo prebuild --platform android

# Run on Android emulator (start emulator first in Android Studio)
npx expo run:android
```

If you don't have an emulator running yet:
1. Open Android Studio
2. More Actions → Virtual Device Manager
3. Start your Pixel device
4. Then run `npx expo run:android`

### 7. Verify

You should see:
- Dark background (#0A0A0A)
- treno.fun logo
- "Connect Wallet" button
- Tapping it will try to open an MWA-compatible wallet

NOTE: MWA only works on a real Android device or an emulator with a wallet app installed.
For initial testing without a wallet, you can temporarily skip the MWA flow
(we'll add a dev bypass in Phase 3).

## File Structure

```
treno-mobile/
├── app/
│   ├── _layout.tsx              # Root layout (polyfills + providers + auth gate)
│   ├── index.tsx                # Login screen
│   └── (tabs)/
│       ├── _layout.tsx          # Bottom tab navigator
│       ├── dashboard.tsx        # Dashboard
│       ├── profile.tsx          # Profile + sign out
│       └── challenges/
│           ├── _layout.tsx      # Stack navigator
│           ├── index.tsx        # Challenge list
│           ├── [id].tsx         # Challenge detail
│           └── new.tsx          # Create challenge
├── components/
│   └── ui/
│       └── index.tsx            # Button, Card, Badge, ProgressBar, etc.
├── lib/
│   ├── api.ts                   # Fetch wrapper with JWT auth
│   ├── auth.ts                  # MWA sign-in + SecureStore JWT storage
│   ├── constants.ts             # API_URL, APP_IDENTITY, SOLANA_CLUSTER
│   └── types.ts                 # TypeScript types matching backend
├── providers/
│   ├── AuthProvider.tsx         # Auth context (isAuthenticated, signIn, signOut)
│   └── index.tsx                # Combined providers wrapper
├── polyfills.ts                 # Buffer + crypto for Solana
├── global.css                   # NativeWind Tailwind imports
├── app.json                     # Expo config
├── babel.config.js              # NativeWind + Reanimated plugins
├── metro.config.js              # NativeWind metro plugin
├── tailwind.config.js           # Theme colors matching web app
├── tsconfig.json                # TypeScript paths
└── nativewind-env.d.ts          # NativeWind className types
```
