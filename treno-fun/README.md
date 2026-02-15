# treno.fun 
### Put your money where your workout is.

treno.fun is a decentralized fitness accountability platform that turns personal health goals into high-stakes, social prediction markets. We combine the financial incentives of crypto with the social pressure of betting and the guidance of AI to ensure you stick to your resolutions.


---

## 🚀 Features

- **Crypto-Powered Accountability** — Create fitness challenges (e.g., *"Run 50km"*) and stake tBNB on your success.
- **Social Betting Markets** — Share your challenge with friends. They can place bets **FOR** or **AGAINST** you using a trustless smart contract.
- **AI Fitness Coach** — An integrated AI agent (powered by OpenAI) analyzes your workout history and active bets to provide personalized training advice and motivation.
- **Automated Tracking** — Seamless integration with Strava to automatically verify workouts via webhooks. No manual data entry. No cheating.
- **Smart Contract Escrow** — Funds are held securely on the BNB Chain (Testnet) and released automatically upon challenge resolution.
- **Real-time Analytics** — Visual dashboards for streak tracking, bet pools, and workout history.

---

## 🛠 Tech Stack

### Frontend & Backend

| Tool | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS, Framer Motion |
| Database | PostgreSQL, Prisma ORM |
| Authentication | NextAuth.js (Strava OAuth & Wallet SIWE) |
| AI | OpenAI API (GPT-4o-mini) |

### Web3 & Blockchain

| Tool | Technology |
|---|---|
| Network | BNB Smart Chain Testnet |
| Contract | Solidity (Hardhat) |
| Interaction | Wagmi, Viem, TanStack Query |

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL Database
- MetaMask (or any Web3 wallet)
- Strava Account (for API credentials)

---

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/treno.fun.git
cd treno.fun
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Variables

Create a `.env` file in the root directory and add the following keys:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/treno_fun"

# Next Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_random_secret_here"

# Strava API (Get from https://www.strava.com/settings/api)
STRAVA_CLIENT_ID="your_strava_client_id"
STRAVA_CLIENT_SECRET="your_strava_client_secret"
NEXT_PUBLIC_STRAVA_CLIENT_ID="your_strava_client_id"
STRAVA_WEBHOOK_VERIFY_TOKEN="random_verification_string"

# OpenAI
OPENAI_API_KEY="sk-..."

# Blockchain (BNB Testnet)
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_BNB_RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545"

# Deployment (Optional - for Hardhat)
DEPLOYER_PRIVATE_KEY="your_wallet_private_key"
BSCSCAN_API_KEY="your_bscscan_api_key"

# Public App URL (For Webhooks)
NEXTAUTH_URL="https://your-deployed-url.com"
```

### 4. Database Setup

Push the Prisma schema to your PostgreSQL database:

```bash
npx prisma generate
npx prisma db push
```

### 5. Smart Contract Deployment

If you want to deploy your own version of the `treno` contract:

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network bscTestnet
```

Copy the resulting address into your `.env` file under `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### 6. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔗 Strava Webhook Setup (Production)

To enable real-time workout syncing from Strava, you need to register a webhook.

1. Ensure your app is deployed publicly (e.g., Vercel) so Strava can reach the API.
2. Run the setup script included in the repo:

```bash
node scripts/setup-strava-webhook.mjs
```

---

## 📜 How It Works

```
Connect → Create → Bet → Train → Resolve
```

1. **Connect** — User connects their Wallet and Strava account.
2. **Create** — User sets a goal (e.g., *"Run 10km by Friday"*) and stakes `0.02 tBNB`.
3. **Bet** — The challenge goes live on-chain. Friends use the invite link to bet.
   - **Bet FOR** → They win if the user succeeds.
   - **Bet AGAINST** → They win if the user fails.
4. **Train** — The user logs workouts. Strava validates the data automatically.
5. **Resolve** — If the goal is met by the deadline, the Smart Contract releases funds. Winners claim their share of the losing pool *(minus a 2% protocol fee)*.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your Changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the Branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

<p align="center">
  <strong>You either get fit and earn — or you pay the price.</strong><br/>
</p>
