# 🚀 Glossy Tic-Tac-Toe — Server & Deployment Guide

Welcome to the production deployment guide for **Glossy Tic-Tac-Toe**! The project includes a full-stack **Node.js + WebSocket Server (`server.js`)** that serves the compiled web app and manages low-latency real-time multiplayer rooms with 6-character room codes.

---

## ⚡ Option 1: Run Online Locally & on Local Network (Immediate)

You can host and play across different devices right now (e.g. from your laptop and phone connected to the same Wi-Fi network):

### 1. Build & Start the Server
```bash
# In the project directory:
npm run build
npm start
```

### 2. Connect from Any Device
The server will automatically detect your local IP address and print:
- **Local Access:** `http://localhost:3000`
- **Mobile/LAN Access:** `http://192.168.x.x:3000` (open this URL on your phone or friend's device!)

Both players can create or join rooms with 6-character codes and play with instantaneous WebSocket synchronization!

---

## 🌐 Option 2: Deploy to Render.com (100% Free with WebSockets)

[Render](https://render.com) provides free cloud hosting with native WebSocket support.

### Step-by-Step:
1. Push this project to your **GitHub** repository.
2. Sign in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
6. Click **Deploy Web Service**!

Render will build and host your game at `https://<your-app>.onrender.com` with full real-time multiplayer enabled.

*(Note: `render.yaml` is pre-configured in the repository root for instant Blueprint deployment).*

---

## 🚂 Option 3: Deploy to Railway.app

[Railway](https://railway.app) automatically detects Node.js apps and deploys with low latency:

1. Push your code to GitHub.
2. Go to [Railway](https://railway.app) and click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically use `railway.json` and start the server with `npm start`.
5. Under Settings → **Networking**, click **Generate Domain**.

---

## 🐳 Option 4: Deploy with Docker (VPS / DigitalOcean / AWS / GCP)

The repository includes an optimized multi-stage `Dockerfile`:

### 1. Build Docker Image
```bash
docker build -t glossy-tic-tac-toe .
```

### 2. Run Container
```bash
docker run -d -p 3000:3000 --name glossy-game glossy-tic-tac-toe
```
The game will now be live on port 3000!

---

## ⚡ Option 5: Serverless Hosting (Vercel / Netlify)

If you prefer static CDN hosting:
- Pre-configured `vercel.json` is included.
- For online multiplayer on static hosts without a Node.js server, configure Firebase Firestore in `.env` (refer to `.env.example`).
