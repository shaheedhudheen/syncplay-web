# 🍿 SyncPlay Web

**SyncPlay Web** is a cozy, low-latency web application designed for you and your partner to watch videos together in perfect synchronization across different computers and locations.

---

## ✨ Features

- **🎬 Perfectly Synchronized Video Playback**:
  - Official YouTube IFrame API and HTML5 direct video support.
  - When either of you clicks **Play**, **Pause**, or **Seeks**, the playback state instantly syncs on your partner's screen with drift compensation.
  - Automatic loopback suppression so actions never echo or stutter.
  - Real-time sync status badge (🟢 Synced / 🟡 Syncing) with a 1-click **Re-sync** button.

- **💬 Real-Time Chat & Activity Feed**:
  - Live chat alongside the video with sender avatars and timestamps.
  - Live typing indicator (`"Partner is typing..."`).
  - Automated activity announcements (e.g., *"Shaheed paused at 03:22"*, *"Partner added a video to queue"*).

- **❤️ Floating Live Reactions**:
  - Interactive reaction bar with ❤️, 😂, 🥺, 🍿, 🔥, 👏.
  - Emojis burst and float up across the video screen in real-time on both computers!

- **📑 Collaborative Queue & Auto-Advance**:
  - Anyone in the room can add videos to the queue.
  - Reorder videos up/down or remove items with 1-click.
  - **Auto-Advance**: When the current video finishes, both screens show a 3-second countdown and smoothly transition to the next video together.

- **🔍 Flexible Ways to Add Videos**:
  - **Paste Video URLs**: Supports YouTube standard links, mobile links, `youtu.be`, YouTube Shorts, and raw MP4/WebM video files.
  - **In-App YouTube Search**: Search music, trailers, or shows directly inside SyncPlay without needing to open other tabs.
  - **1-Click Quick Paste**: Paste straight from your clipboard with live title and thumbnail preview.
  - **Curated Demos**: Instant 1-click sample videos to test syncing immediately.

- **💾 Saved Playlists & Watch History**:
  - **Watch History**: Automatically logs every video watched together; re-add past videos to the queue with one click.
  - **Custom Playlists**: Save your active queue as a named playlist (e.g., *"Our Favorite Songs"*, *"Movie Night"*), and load playlists whenever you want.
  - **Persistent Rooms**: Room state and history are saved to the persistent database so you can close tabs and resume right where you left off.

- **🛋️ Cozy Room Creation & Joining**:
  - 1-Click cozy room slugs (e.g. `movie-night-492`) or custom room names.
  - Prominent **"Copy Partner Link"** button to quickly share the room URL.
  - Nickname and avatar selector with remember-me storage (zero login friction).

---

## 🚀 Quick Start

### 1. Start Development Server
From the root project directory:
```bash
npm run dev
```
This runs both the backend server (`http://localhost:3001`) and frontend client (`http://localhost:5173`) concurrently.

### 2. Open the App
Visit:
```
http://localhost:5173
```
- Click **"Create Watch Room"**
- Click **"Copy Partner Link"** and open the link in a second window or send it to your partner!

---

## 🌐 Connecting Across Different Computers (Over the Internet)

If you and your partner are in different homes on different Wi-Fi networks, you can make your room reachable with **zero port-forwarding** using either Cloudflare Tunnel or ngrok:

### Option 1: Free Cloudflare Tunnel (Recommended, No Account Needed)
Open a new terminal and run:
```bash
npx cloudflared tunnel --url http://localhost:5173
```
Cloudflare will give you a free public URL (e.g. `https://random-words.trycloudflare.com`). Share that link with your partner!

### Option 2: ngrok
```bash
npx ngrok http 5173
```
Copy the provided `https://...ngrok-free.app` URL and send it to your partner.

### Option 3: Same Wi-Fi / Local Network
If you are on the same Wi-Fi network at home:
1. Find your local IP (e.g., `192.168.1.50`).
2. Your partner can open `http://192.168.1.50:5173` in their browser.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, Socket.io, TypeScript (`tsx`).
- **Persistence**: File-based persistent JSON store (`server/data/syncplay_db.json`).
- **Video Engine**: Official YouTube IFrame API + HTML5 Video Engine.
