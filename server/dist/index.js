"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const database_js_1 = require("./database.js");
const rooms_js_1 = require("./rooms.js");
const sockets_js_1 = require("./sockets.js");
const youtube_js_1 = require("./youtube.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 3001;
// CORS setup to allow client from localhost:5173, tunnels, or LAN
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));
app.use(express_1.default.json());
// Setup Socket.io with open CORS for remote partners
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
});
(0, sockets_js_1.setupSocketHandlers)(io);
// API Endpoints
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// List recent rooms
app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: database_js_1.db.getAllRooms() });
});
// Generate a new cozy room slug
app.get('/api/rooms/generate-slug', (_req, res) => {
    res.json({ slug: rooms_js_1.roomManager.generateCozySlug() });
});
// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
    const room = rooms_js_1.roomManager.getRoom(req.params.roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ room });
});
// In-app video search
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.json({ results: [] });
    }
    try {
        const results = await (0, youtube_js_1.searchYouTube)(query);
        res.json({ results });
    }
    catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});
// Resolve video metadata
app.get('/api/resolve', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    const video = await (0, youtube_js_1.resolveVideoMetadata)(url, 'Preview');
    if (!video) {
        return res.status(404).json({ error: 'Could not resolve video metadata' });
    }
    res.json({ video });
});
// Playlists
app.get('/api/playlists', (_req, res) => {
    res.json({ playlists: database_js_1.db.getPlaylists() });
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
    database_js_1.db.savePlaylist(playlist);
    res.json({ playlist });
});
app.delete('/api/playlists/:id', (req, res) => {
    const success = database_js_1.db.deletePlaylist(req.params.id);
    res.json({ success });
});
// In production, serve the client build
let clientDistPath = path_1.default.resolve(process.cwd(), 'client/dist');
if (!fs_1.default.existsSync(clientDistPath)) {
    clientDistPath = path_1.default.resolve(process.cwd(), '../client/dist');
}
app.use(express_1.default.static(clientDistPath));
app.get('*', (_req, res) => {
    const indexPath = path_1.default.join(clientDistPath, 'index.html');
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.status(200).send('SyncPlay Web API Server is running.');
    }
});
server.listen(PORT, () => {
    console.log(`🍿 [SyncPlay Server] Listening at http://localhost:${PORT}`);
});
