import { db } from './database.js';
import { ChatMessage, PlaybackState, PlayerActivityItem, RoomState, RoomUser, VideoItem, WatchHistoryItem } from './types.js';

class RoomManager {
  private activeRooms: Map<string, RoomState> = new Map();
  private lastSeekTimes: Map<string, number> = new Map();

  constructor() {
    // Rooms will be loaded from DB on-demand or pre-cached
  }

  /**
   * Generates a cozy room slug like 'movie-night-492' or 'date-night-128'
   */
  public generateCozySlug(): string {
    const prefixes = ['movie-night', 'cozy-cinema', 'date-night', 'sync-lounge', 'popcorn-party', 'snuggle-stream'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
  }

  /**
   * Retrieves an active room or loads it from persistence, or creates it if it doesn't exist
   */
  public getOrCreateRoom(roomId: string, customName?: string): RoomState {
    const cleanId = roomId.trim().toLowerCase();

    if (this.activeRooms.has(cleanId)) {
      const room = this.activeRooms.get(cleanId)!;
      if (customName && customName.trim()) {
        room.name = customName.trim();
        db.saveRoom(room);
      }
      return room;
    }

    // Try loading from database
    const saved = db.getRoom(cleanId);
    if (saved) {
      if (customName && customName.trim()) {
        saved.name = customName.trim();
        db.saveRoom(saved);
      }
      // Clean up legacy seek/pause spam from chat messages
      if (Array.isArray(saved.chatMessages)) {
        saved.chatMessages = saved.chatMessages.filter(
          (m) => !(m.isSystem && (m.text.includes('jumped to') || m.text.includes('paused at')))
        );
      }
      saved.activityLog = saved.activityLog || [];
      // Clear previous socket connections on fresh server load
      saved.users = {};
      this.activeRooms.set(cleanId, saved);
      return saved;
    }

    // Initialize fresh room
    const newRoom: RoomState = {
      id: cleanId,
      name: customName || cleanId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: Date.now(),
      currentVideo: null,
      playback: {
        state: 'paused',
        currentTime: 0,
        playbackRate: 1,
        lastUpdated: Date.now(),
        updatedBy: 'System',
      },
      queue: [],
      chatMessages: [
        {
          id: `msg_welcome_${Date.now()}`,
          userId: 'system',
          userName: 'SyncPlay Bot',
          userAvatar: '🍿',
          text: 'Welcome to your cozy watch room! Paste a video link or search to start watching together.',
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      users: {},
      history: [],
      activityLog: [],
    };

    this.activeRooms.set(cleanId, newRoom);
    db.saveRoom(newRoom);
    return newRoom;
  }

  public getRoom(roomId: string): RoomState | undefined {
    const cleanId = roomId.trim().toLowerCase();
    if (this.activeRooms.has(cleanId)) {
      return this.activeRooms.get(cleanId);
    }
    const saved = db.getRoom(cleanId);
    if (saved) {
      saved.users = {};
      this.activeRooms.set(cleanId, saved);
      return saved;
    }
    return undefined;
  }

  /**
   * Add user to room
   */
  public addUser(roomId: string, socketId: string, user: { userId: string; name: string; avatar: string }): RoomUser {
    const room = this.getOrCreateRoom(roomId);
    const roomUser: RoomUser = {
      socketId,
      userId: user.userId,
      name: user.name,
      avatar: user.avatar || '🐱',
      joinedAt: Date.now(),
    };
    room.users[socketId] = roomUser;
    db.saveRoom(room);
    return roomUser;
  }

  /**
   * Remove user from room on disconnect
   */
  public removeUser(roomId: string, socketId: string): RoomUser | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room || !room.users[socketId]) return null;

    const removed = room.users[socketId];
    delete room.users[socketId];
    db.saveRoom(room);
    return removed;
  }

  /**
   * Update playback status
   */
  public updatePlayback(
    roomId: string,
    action: 'play' | 'pause' | 'seek' | 'rate',
    currentTime: number,
    playbackRate: number = 1,
    userName: string = 'User'
  ): PlaybackState | null {
    const cleanId = roomId.toLowerCase();
    const room = this.activeRooms.get(cleanId);
    if (!room) return null;

    if (action === 'seek') {
      this.lastSeekTimes.set(cleanId, Date.now());
    } else if (action === 'pause') {
      const lastSeek = this.lastSeekTimes.get(cleanId) || 0;
      // If room was actively playing and a pause arrives within 800ms of a seek,
      // it's a spurious browser/iframe buffering artifact, not an intentional user pause.
      if (room.playback.state === 'playing' && Date.now() - lastSeek < 800) {
        return null;
      }
    }

    const newState = action === 'play' ? 'playing' : action === 'pause' ? 'paused' : room.playback.state;

    room.playback = {
      state: newState,
      currentTime: Math.max(0, currentTime),
      playbackRate: playbackRate || 1,
      lastUpdated: Date.now(),
      updatedBy: userName,
    };

    db.saveRoom(room);
    return room.playback;
  }

  /**
   * Calculates the exact real-time playback position accounting for elapsed time
   */
  public getInterpolatedTime(playback: PlaybackState): number {
    if (playback.state !== 'playing') {
      return playback.currentTime;
    }
    const elapsedSeconds = ((Date.now() - playback.lastUpdated) / 1000) * playback.playbackRate;
    return playback.currentTime + elapsedSeconds;
  }

  /**
   * Add video to room queue
   */
  public addToQueue(roomId: string, video: VideoItem): VideoItem[] | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room) return null;

    // If no video is currently playing and queue is empty, auto-start this video!
    if (!room.currentVideo && room.queue.length === 0) {
      room.currentVideo = video;
      room.playback = {
        state: 'playing',
        currentTime: 0,
        playbackRate: 1,
        lastUpdated: Date.now(),
        updatedBy: video.addedBy,
      };
      this.recordWatchHistory(room, video);
    } else {
      room.queue.push(video);
    }

    db.saveRoom(room);
    return room.queue;
  }

  /**
   * Set video as current video directly
   */
  public playVideo(roomId: string, video: VideoItem, playedBy: string): RoomState | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room) return null;

    // Remove from queue if it was in queue
    room.queue = room.queue.filter((v) => v.id !== video.id);

    room.currentVideo = video;
    room.playback = {
      state: 'playing',
      currentTime: 0,
      playbackRate: 1,
      lastUpdated: Date.now(),
      updatedBy: playedBy,
    };

    this.recordWatchHistory(room, video);
    db.saveRoom(room);
    return room;
  }

  /**
   * Advance to the next video in queue
   */
  public playNext(roomId: string): { nextVideo: VideoItem | null; room: RoomState } | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room) return null;

    if (room.queue.length > 0) {
      const nextVideo = room.queue.shift()!;
      room.currentVideo = nextVideo;
      room.playback = {
        state: 'playing',
        currentTime: 0,
        playbackRate: 1,
        lastUpdated: Date.now(),
        updatedBy: 'Auto-Advance',
      };
      this.recordWatchHistory(room, nextVideo);
    } else {
      room.currentVideo = null;
      room.playback = {
        state: 'paused',
        currentTime: 0,
        playbackRate: 1,
        lastUpdated: Date.now(),
        updatedBy: 'Queue Ended',
      };
    }

    db.saveRoom(room);
    return { nextVideo: room.currentVideo, room };
  }

  /**
   * Remove video from queue
   */
  public removeFromQueue(roomId: string, videoId: string): VideoItem[] | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room) return null;

    room.queue = room.queue.filter((v) => v.id !== videoId);
    db.saveRoom(room);
    return room.queue;
  }

  /**
   * Reorder queue items
   */
  public reorderQueue(roomId: string, fromIndex: number, toIndex: number): VideoItem[] | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room) return null;

    if (fromIndex < 0 || fromIndex >= room.queue.length || toIndex < 0 || toIndex >= room.queue.length) {
      return room.queue;
    }

    const [movedItem] = room.queue.splice(fromIndex, 1);
    room.queue.splice(toIndex, 0, movedItem);

    db.saveRoom(room);
    return room.queue;
  }

  /**
   * Add chat message to room
   */
  public addChatMessage(
    roomId: string,
    message: { userId: string; userName: string; userAvatar: string; text: string; isSystem?: boolean }
  ): ChatMessage | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room) return null;

    const chatMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: message.userId,
      userName: message.userName,
      userAvatar: message.userAvatar || '🐱',
      text: message.text,
      timestamp: Date.now(),
      isSystem: message.isSystem || false,
    };

    room.chatMessages.push(chatMsg);
    db.saveRoom(room);
    return chatMsg;
  }

  /**
   * Add dedicated player activity log item (play, pause, seek, video changes)
   */
  public addActivity(roomId: string, activity: PlayerActivityItem): PlayerActivityItem | null {
    const room = this.activeRooms.get(roomId.toLowerCase());
    if (!room) return null;

    if (!room.activityLog) {
      room.activityLog = [];
    }

    room.activityLog.push(activity);
    if (room.activityLog.length > 50) {
      room.activityLog = room.activityLog.slice(-50);
    }

    db.saveRoom(room);
    return activity;
  }

  /**
   * Record watched video in room history
   */
  private recordWatchHistory(room: RoomState, video: VideoItem) {
    const historyItem: WatchHistoryItem = {
      id: `hist_${Date.now()}`,
      video,
      watchedAt: Date.now(),
    };
    room.history.unshift(historyItem);
    if (room.history.length > 50) {
      room.history.pop();
    }
  }
}

export const roomManager = new RoomManager();
