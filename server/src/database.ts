import fs from 'fs';
import path from 'path';
import { RoomState, SavedPlaylist, WatchHistoryItem } from './types.js';

interface DatabaseSchema {
  rooms: Record<string, RoomState>;
  playlists: SavedPlaylist[];
  globalHistory: WatchHistoryItem[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'syncplay_db.json');

class Database {
  private data: DatabaseSchema = {
    rooms: {},
    playlists: [],
    globalHistory: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          rooms: parsed.rooms || {},
          playlists: parsed.playlists || [],
          globalHistory: parsed.globalHistory || [],
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[DB] Failed to initialize database file:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to persist database:', err);
    }
  }

  public getRoom(roomId: string): RoomState | undefined {
    return this.data.rooms[roomId];
  }

  public saveRoom(room: RoomState): void {
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

  public getAllRooms(): { id: string; name: string; currentVideo: string | null; userCount: number; createdAt: number }[] {
    return Object.values(this.data.rooms).map((r) => ({
      id: r.id,
      name: r.name,
      currentVideo: r.currentVideo ? r.currentVideo.title : null,
      userCount: Object.keys(r.users || {}).length,
      createdAt: r.createdAt,
    }));
  }

  public getPlaylists(): SavedPlaylist[] {
    return this.data.playlists;
  }

  public savePlaylist(playlist: SavedPlaylist): void {
    const existingIndex = this.data.playlists.findIndex((p) => p.id === playlist.id);
    if (existingIndex >= 0) {
      this.data.playlists[existingIndex] = playlist;
    } else {
      this.data.playlists.push(playlist);
    }
    this.save();
  }

  public deletePlaylist(playlistId: string): boolean {
    const prevLen = this.data.playlists.length;
    this.data.playlists = this.data.playlists.filter((p) => p.id !== playlistId);
    if (this.data.playlists.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new Database();
