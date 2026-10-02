"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomManager = void 0;
const database_js_1 = require("./database.js");
class RoomManager {
    activeRooms = new Map();
    lastSeekTimes = new Map();
    constructor() {
        // Rooms will be loaded from DB on-demand or pre-cached
    }
    /**
     * Generates a cozy room slug like 'movie-night-492' or 'date-night-128'
     */
    generateCozySlug() {
        const prefixes = ['movie-night', 'cozy-cinema', 'date-night', 'sync-lounge', 'popcorn-party', 'snuggle-stream'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const num = Math.floor(100 + Math.random() * 900);
        return `${prefix}-${num}`;
    }
    /**
     * Retrieves an active room or loads it from persistence, or creates it if it doesn't exist
     */
    getOrCreateRoom(roomId, customName) {
        const cleanId = roomId.trim().toLowerCase();
        if (this.activeRooms.has(cleanId)) {
            const room = this.activeRooms.get(cleanId);
            if (customName && customName.trim()) {
                room.name = customName.trim();
                database_js_1.db.saveRoom(room);
            }
            return room;
        }
        // Try loading from database
        const saved = database_js_1.db.getRoom(cleanId);
        if (saved) {
            if (customName && customName.trim()) {
                saved.name = customName.trim();
                database_js_1.db.saveRoom(saved);
            }
            // Clean up legacy seek/pause spam from chat messages
            if (Array.isArray(saved.chatMessages)) {
                saved.chatMessages = saved.chatMessages.filter((m) => !(m.isSystem && (m.text.includes('jumped to') || m.text.includes('paused at'))));
            }
            saved.activityLog = saved.activityLog || [];
            // Clear previous socket connections on fresh server load
            saved.users = {};
            this.activeRooms.set(cleanId, saved);
            return saved;
        }
        // Initialize fresh room
        const newRoom = {
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
        database_js_1.db.saveRoom(newRoom);
        return newRoom;
    }
    getRoom(roomId) {
        const cleanId = roomId.trim().toLowerCase();
        if (this.activeRooms.has(cleanId)) {
            return this.activeRooms.get(cleanId);
        }
        const saved = database_js_1.db.getRoom(cleanId);
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
    addUser(roomId, socketId, user) {
        const room = this.getOrCreateRoom(roomId);
        const roomUser = {
            socketId,
            userId: user.userId,
            name: user.name,
            avatar: user.avatar || '🐱',
            joinedAt: Date.now(),
        };
        room.users[socketId] = roomUser;
        database_js_1.db.saveRoom(room);
        return roomUser;
    }
    /**
     * Remove user from room on disconnect
     */
    removeUser(roomId, socketId) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room || !room.users[socketId])
            return null;
        const removed = room.users[socketId];
        delete room.users[socketId];
        database_js_1.db.saveRoom(room);
        return removed;
    }
    /**
     * Update playback status
     */
    updatePlayback(roomId, action, currentTime, playbackRate = 1, userName = 'User') {
        const cleanId = roomId.toLowerCase();
        const room = this.activeRooms.get(cleanId);
        if (!room)
            return null;
        if (action === 'seek') {
            this.lastSeekTimes.set(cleanId, Date.now());
        }
        else if (action === 'pause') {
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
        database_js_1.db.saveRoom(room);
        return room.playback;
    }
    /**
     * Calculates the exact real-time playback position accounting for elapsed time
     */
    getInterpolatedTime(playback) {
        if (playback.state !== 'playing') {
            return playback.currentTime;
        }
        const elapsedSeconds = ((Date.now() - playback.lastUpdated) / 1000) * playback.playbackRate;
        return playback.currentTime + elapsedSeconds;
    }
    /**
     * Add video to room queue
     */
    addToQueue(roomId, video) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room)
            return null;
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
        }
        else {
            room.queue.push(video);
        }
        database_js_1.db.saveRoom(room);
        return room.queue;
    }
    /**
     * Set video as current video directly
     */
    playVideo(roomId, video, playedBy) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room)
            return null;
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
        database_js_1.db.saveRoom(room);
        return room;
    }
    /**
     * Advance to the next video in queue
     */
    playNext(roomId) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room)
            return null;
        if (room.queue.length > 0) {
            const nextVideo = room.queue.shift();
            room.currentVideo = nextVideo;
            room.playback = {
                state: 'playing',
                currentTime: 0,
                playbackRate: 1,
                lastUpdated: Date.now(),
                updatedBy: 'Auto-Advance',
            };
            this.recordWatchHistory(room, nextVideo);
        }
        else {
            room.currentVideo = null;
            room.playback = {
                state: 'paused',
                currentTime: 0,
                playbackRate: 1,
                lastUpdated: Date.now(),
                updatedBy: 'Queue Ended',
            };
        }
        database_js_1.db.saveRoom(room);
        return { nextVideo: room.currentVideo, room };
    }
    /**
     * Remove video from queue
     */
    removeFromQueue(roomId, videoId) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room)
            return null;
        room.queue = room.queue.filter((v) => v.id !== videoId);
        database_js_1.db.saveRoom(room);
        return room.queue;
    }
    /**
     * Reorder queue items
     */
    reorderQueue(roomId, fromIndex, toIndex) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room)
            return null;
        if (fromIndex < 0 || fromIndex >= room.queue.length || toIndex < 0 || toIndex >= room.queue.length) {
            return room.queue;
        }
        const [movedItem] = room.queue.splice(fromIndex, 1);
        room.queue.splice(toIndex, 0, movedItem);
        database_js_1.db.saveRoom(room);
        return room.queue;
    }
    /**
     * Add chat message to room
     */
    addChatMessage(roomId, message) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room)
            return null;
        const chatMsg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: message.userId,
            userName: message.userName,
            userAvatar: message.userAvatar || '🐱',
            text: message.text,
            timestamp: Date.now(),
            isSystem: message.isSystem || false,
        };
        room.chatMessages.push(chatMsg);
        database_js_1.db.saveRoom(room);
        return chatMsg;
    }
    /**
     * Add dedicated player activity log item (play, pause, seek, video changes)
     */
    addActivity(roomId, activity) {
        const room = this.activeRooms.get(roomId.toLowerCase());
        if (!room)
            return null;
        if (!room.activityLog) {
            room.activityLog = [];
        }
        room.activityLog.push(activity);
        if (room.activityLog.length > 50) {
            room.activityLog = room.activityLog.slice(-50);
        }
        database_js_1.db.saveRoom(room);
        return activity;
    }
    /**
     * Record watched video in room history
     */
    recordWatchHistory(room, video) {
        const historyItem = {
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
exports.roomManager = new RoomManager();
