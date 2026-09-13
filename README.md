# ⚡ GLOSSY TIC-TAC-TOE

A production-ready, ultra-responsive, real-time playable web application built with a modern glossy glassmorphism aesthetic.

---

## 🎮 Features & Game Modes

### 1. 🤖 Play with Computer (AI)
- **Mathematical Minimax Engine**: The **Hard** difficulty evaluates every possible game tree outcome with depth penalization — it is mathematically unbeatable and will never lose.
- **Medium Difficulty**: Combines tactical win/block instincts with human-like heuristics and strategic corner/center priority.
- **Easy Difficulty**: Casual legal moves with occasional defensive blocks.
- **Natural AI Delay**: Simulates realistic human thinking (350ms - 650ms) with a pulsing thinking indicator so the UI stays ultra-responsive.
- **Custom Symbol**: Choose to play as **X** (cyan laser) or **O** (radiant violet).

### 2. 👥 Local 2 Player
- Pass and play on the same device.
- Custom player names and live scoreboards for Player 1 (X) and Player 2 (O).
- Instant rematch and round reset with series standings preserved.

### 3. 🌐 Online 2 Player (Real-time Multiplayer)
- **Room Code Architecture**: Host creates a unique 6-character room code (e.g. `K9X2P7`) with one-click clipboard copy and Web Share API integration.
- **Real-Time Synchronization**: Moves, turns, board state, rematches, and victory lines are synchronized live.
- **Presence & Disconnect Detection**: Active heartbeat monitoring warns if an opponent loses connection.
- **Dual-Transport Architecture**:
  - **Firebase Firestore**: Production cloud matchmaking across devices and networks.
  - **Cross-Tab Synchronizer**: Automatic zero-config BroadcastChannel sync allows instant multiplayer testing in two tabs or windows without entering API credentials!

---

## 💎 Design & Visuals
- **Deep Obsidian Glassmorphism**: Frosted glass panels (`backdrop-filter: blur(20px)`), gradient borders, and subtle radial neons.
- **Laser Gradients**: Electric Cyan (`#00f2fe`) for **X**, Radiant Violet (`#f355da`) for **O**, and Emerald (`#10b981`) for Win lines.
- **Animated SVG Symbols**: Progressive stroke drawing animations for X lines and O circles.
- **Celebratory Confetti**: High-performance particle bursts on victory.
- **Web Audio API Synthesizer**: Procedural, zero-asset digital sound effects (chimes, clicks, victory fanfares) with an instant sound mute toggle.
- **Accessibility**: Full keyboard navigation (Tab / Enter / Space / Arrow keys), ARIA live updates, and `prefers-reduced-motion` compliance.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone the repository and navigate to the project directory
npm install
```

### Running Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Testing Online Multiplayer
1. Open `http://localhost:5173` in two browser windows or tabs.
2. In Window 1: Select **Online 2 Player** -> Click **CREATE ROOM** -> Copy the 6-character room code.
3. In Window 2: Select **Online 2 Player** -> Click **JOIN ROOM** -> Paste the code -> Click **JOIN ROOM**.
4. Both windows will immediately connect into the live match!

---

## ☁️ Setting Up Cloud Firebase Firestore (Optional)

To enable cross-network online multiplayer across different computers or mobile phones:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Navigate to **Firestore Database** and create a database in **Production mode** (or test mode).
3. Under **Project settings** -> **General**, register a **Web App** to obtain your config keys.
4. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
5. Populate `.env.local` with your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-app
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:...
   ```
6. Deploy the security rules from `firestore.rules` in your Firebase Firestore console.

---

## 🛠️ Production Build

```bash
npm run build
```
Generates an optimized production bundle in the `dist/` folder.
