"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(process.cwd(), 'data');
const DB_FILE = path_1.default.join(DATA_DIR, 'syncplay_db.json');
class Database {
    data = {
        rooms: {},
        playlists: [],
        globalHistory: [],
    };
    constructor() {
        this.init();
    }
    init() {
        try {
            if (!fs_1.default.existsSync(DATA_DIR)) {
                fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
            }
            if (fs_1.default.existsSync(DB_FILE)) {
                const raw = fs_1.default.readFileSync(DB_FILE, 'utf-8');
                const parsed = JSON.parse(raw);
                this.data = {
                    rooms: parsed.rooms || {},
                    playlists: parsed.playlists || [],
                    globalHistory: parsed.globalHistory || [],
                };
            }
            else {
                this.save();
            }
        }
        catch (err) {
            console.error('[DB] Failed to initialize database file:', err);
        }
    }
    save() {
        try {
            fs_1.default.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[DB] Failed to persist database:', err);
        }
    }
    getRoom(roomId) {
        return this.data.rooms[roomId];
    }
    saveRoom(room) {
        // We preserve room state but clear disconnected transient socket users when saving
        this.data.rooms[room.id] = {
            ...room,
            // Keep chat limited to last 150 messages to keep DB lean
            chatMessages: room.chatMessages.slice(-150),
            // Keep room history limited to last 100 items
            history: room.history.slice(-100),
        };
        this.save();
    }
    getAllRooms() {
        return Object.values(this.data.rooms).map((r) => ({
            id: r.id,
            name: r.name,
            currentVideo: r.currentVideo ? r.currentVideo.title : null,
            userCount: Object.keys(r.users || {}).length,
            createdAt: r.createdAt,
        }));
    }
    getPlaylists() {
        return this.data.playlists;
    }
    savePlaylist(playlist) {
        const existingIndex = this.data.playlists.findIndex((p) => p.id === playlist.id);
        if (existingIndex >= 0) {
            this.data.playlists[existingIndex] = playlist;
        }
        else {
            this.data.playlists.push(playlist);
        }
        this.save();
    }
    deletePlaylist(playlistId) {
        const prevLen = this.data.playlists.length;
        this.data.playlists = this.data.playlists.filter((p) => p.id !== playlistId);
        if (this.data.playlists.length !== prevLen) {
            this.save();
            return true;
        }
        return false;
    }
}
exports.db = new Database();
