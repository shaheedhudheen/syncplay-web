import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { db } from './database.js';
import { roomManager } from './rooms.js';
import { setupSocketHandlers } from './sockets.js';
import { resolveVideoMetadata, searchYouTube } from './youtube.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// CORS setup to allow client from localhost:5173, tunnels, or LAN
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json());

// Setup Socket.io with open CORS for remote partners
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

setupSocketHandlers(io);

// API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// List recent rooms
app.get('/api/rooms', (_req, res) => {
  res.json({ rooms: db.getAllRooms() });
});

// Generate a new cozy room slug
app.get('/api/rooms/generate-slug', (_req, res) => {
  res.json({ slug: roomManager.generateCozySlug() });
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room });
});

// In-app video search
app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.json({ results: [] });
  }
  try {
    const results = await searchYouTube(query);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Resolve video metadata
app.get('/api/resolve', async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  const video = await resolveVideoMetadata(url, 'Preview');
  if (!video) {
    return res.status(404).json({ error: 'Could not resolve video metadata' });
  }
  res.json({ video });
});

// Playlists
app.get('/api/playlists', (_req, res) => {
  res.json({ playlists: db.getPlaylists() });
});

app.post('/api/playlists', (req, res) => {
  const { name, description, videos, createdBy } = req.body;
  if (!name || !Array.isArray(videos)) {
    return res.status(400).json({ error: 'Name and videos array required' });
  }
  const playlist = {
    id: `pl_${Date.now()}`,
    name,
    description,
    videos,
    createdAt: Date.now(),
    createdBy: createdBy || 'Anonymous',
  };
  db.savePlaylist(playlist);
  res.json({ playlist });
});

app.delete('/api/playlists/:id', (req, res) => {
  const success = db.deletePlaylist(req.params.id);
  res.json({ success });
});

// In production, serve the client build
let clientDistPath = path.resolve(process.cwd(), 'client/dist');
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.resolve(process.cwd(), '../client/dist');
}
app.use(express.static(clientDistPath));
app.get('*', (_req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('SyncPlay Web API Server is running.');
  }
});

server.listen(PORT, () => {
  console.log(`🍿 [SyncPlay Server] Listening at http://localhost:${PORT}`);
});
