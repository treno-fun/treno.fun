# Treno - Fitness Challenges with Friends

Treno is a mobile app that lets you turn your workouts into a competition. You can start a fitness race with a friend, and once the challenge is locked in, other people can participate by betting on who they think will win.

[Pitch deck](https://trenodeck.vercel.app) 
---

## 📋 How it Works

Treno is built to make exercising more social and rewarding using a simple three-step process:

1. **Start a Duel**  
   Create a challenge (like running 5km or finishing 10 workouts) and invite a friend. To make it official, both players lock in a small amount of digital currency.

2. **Locked for Betting**  
   Once your friend accepts and the challenge begins, it is "Locked." Now, your other friends or the community can see the duel and place bets on which of you they think will win.

3. **Win and Claim**  
   The app connects to Strava to track your movement automatically. As soon as a winner is determined, the smart contract settles the results. The winner and the people who bet on them can then claim their rewards directly to their wallets.

---

## 🖼️ User Interface

Below are screenshots of the Treno mobile experience, showing how you can view active duels and track your progress.


| Dashboard | Challenge View  | Link Sharing view|
| :--- | :--- | :--- |
| ![Dashboard](https://github.com/user-attachments/assets/11e12add-6474-4c42-be71-47e635349a19) | ![Challenge](https://github.com/user-attachments/assets/fb7d0cd2-1040-4e15-8b67-ce3519913447)  | ![Link Sharing view](https://github.com/user-attachments/assets/72e91254-e8dc-4271-a4e1-d12da124d60f)  |


---

## 🏗️ System Architecture

This diagram explains how the treno actually works to keep every challenge fair and transparent.

<img width="2339" height="2181" alt="treno-architecture-image" src="https://github.com/user-attachments/assets/61e0ecfc-2add-4f3f-9a42-a3288c1c3033" />

---

## ⛓️ Blockchain Specification

Treno uses the Solana network to ensure that all challenges and bets are handled safely without the need for a middleman.

*   **Network:** Solana Devnet
*   **Program ID (Contract Address):** `7aEwhb6UGP9btKmfEwXpTVSjGngUsdmiMA2vVtoFwnVz`
*   **Platform Fee:** A small 2% fee is applied only to winning claims to support the app.

---

## 🛠️ Technical Stack

*   **Mobile App:** Built with React Native and Expo.
*   **Wallet Integration:** Uses Solana Mobile Wallet Adapter (compatible with Phantom and Solflare).
*   **Data Tracking:** Direct integration with the Strava API for verified movement data.
*   **Database:** PostgreSQL with Prisma ORM.
*   **Smart Contracts:** Built using the Anchor Framework on Solana.

---

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v18 or higher)
*   A Solana-compatible wallet installed on your mobile device (like Phantom)

### Setup Instructions

1.  **Clone the repository**
    ```bash
    git clone https://github.com/treno-fun/treno-mobile.git
    cd treno-mobile
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure environment**
    Ensure `lib/constants.ts` is configured with your backend API URL and Solana RPC endpoint.

4.  **Launch the application**
    ```bash
    npx expo run:android

    ```

---

## 📄 License

This project is licensed under the MIT License.

---
**treno.fun** — *Where fitness goals meet verifiable results.*
