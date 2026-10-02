"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const database_js_1 = require("./database.js");
const rooms_js_1 = require("./rooms.js");
const youtube_js_1 = require("./youtube.js");
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        let currentRoomId = null;
        let currentUser = null;
        // Join room
        socket.on('join_room', ({ roomId, user, customName }) => {
            const room = rooms_js_1.roomManager.getOrCreateRoom(roomId, customName);
            currentRoomId = room.id;
            currentUser = user;
            socket.join(room.id);
            const roomUser = rooms_js_1.roomManager.addUser(room.id, socket.id, user);
            // Interpolate current exact time if video is playing
            const currentCalculatedTime = rooms_js_1.roomManager.getInterpolatedTime(room.playback);
            const stateToSend = {
                ...room,
                playback: {
                    ...room.playback,
                    currentTime: currentCalculatedTime,
                },
            };
            // Send full state to joining user
            socket.emit('room_state', stateToSend);
            // Notify others in the room
            socket.to(room.id).emit('user_joined', roomUser);
            // System announcement
            const joinMsg = rooms_js_1.roomManager.addChatMessage(room.id, {
                userId: 'system',
                userName: 'SyncPlay',
                userAvatar: '👋',
                text: `${user.name} joined the room`,
                isSystem: true,
            });
            if (joinMsg) {
                io.to(room.id).emit('new_chat', joinMsg);
            }
        });
        // Request active synchronization state (drift recovery)
        socket.on('request_sync', () => {
            if (!currentRoomId)
                return;
            const room = rooms_js_1.roomManager.getRoom(currentRoomId);
            if (!room)
                return;
            const exactTime = rooms_js_1.roomManager.getInterpolatedTime(room.playback);
            socket.emit('sync_playback', {
                state: room.playback.state,
                currentTime: exactTime,
                playbackRate: room.playback.playbackRate,
                lastUpdated: Date.now(),
                updatedBy: room.playback.updatedBy,
            });
        });
        // Playback control (play, pause, seek, rate)
        socket.on('playback_action', ({ action, currentTime, playbackRate, }) => {
            if (!currentRoomId || !currentUser)
                return;
            const updatedPlayback = rooms_js_1.roomManager.updatePlayback(currentRoomId, action, currentTime, playbackRate || 1, currentUser.name);
            if (updatedPlayback) {
                // Broadcast authoritative playback state to all clients in room (including sender)
                io.to(currentRoomId).emit('sync_playback', updatedPlayback);
                // Broadcast dedicated player activity event (keeps live chat completely clean!)
                if (action === 'pause' || action === 'seek' || action === 'play') {
                    const minutes = Math.floor(currentTime / 60);
                    const seconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
                    const timeStr = `${minutes}:${seconds}`;
                    const actionText = action === 'pause'
                        ? `paused at ${timeStr}`
                        : action === 'seek'
                            ? `jumped to ${timeStr}`
                            : 'resumed playback';
                    const activityItem = rooms_js_1.roomManager.addActivity(currentRoomId, {
                        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        userId: currentUser.userId,
                        userName: currentUser.name,
                        userAvatar: currentUser.avatar,
                        action,
                        timeStr,
                        text: `${currentUser.name} ${actionText}`,
                        timestamp: Date.now(),
                    });
                    if (activityItem) {
                        io.to(currentRoomId).emit('player_activity', activityItem);
                    }
                }
            }
        });
        // Add video to queue
        socket.on('add_to_queue', async ({ input }) => {
            if (!currentRoomId || !currentUser)
                return;
            const video = await (0, youtube_js_1.resolveVideoMetadata)(input, currentUser.name);
            if (!video) {
                socket.emit('error_message', { message: 'Could not resolve video from link. Please check the URL.' });
                return;
            }
            const room = rooms_js_1.roomManager.getRoom(currentRoomId);
            const isFirstAutoPlay = !room?.currentVideo;
            rooms_js_1.roomManager.addToQueue(currentRoomId, video);
            const updatedRoom = rooms_js_1.roomManager.getRoom(currentRoomId);
            if (updatedRoom) {
                io.to(currentRoomId).emit('queue_updated', {
                    queue: updatedRoom.queue,
                    currentVideo: updatedRoom.currentVideo,
                    playback: updatedRoom.playback,
                });
                const sysMsg = rooms_js_1.roomManager.addChatMessage(currentRoomId, {
                    userId: 'system',
                    userName: 'SyncPlay',
                    userAvatar: '🎬',
                    text: isFirstAutoPlay
                        ? `${currentUser.name} started playing "${video.title}"`
                        : `${currentUser.name} added "${video.title}" to the queue`,
                    isSystem: true,
                });
                if (sysMsg) {
                    io.to(currentRoomId).emit('new_chat', sysMsg);
                }
            }
        });
        // Skip directly to a queued video
        socket.on('play_queued_video', ({ video }) => {
            if (!currentRoomId || !currentUser)
                return;
            const updated = rooms_js_1.roomManager.playVideo(currentRoomId, video, currentUser.name);
            if (updated) {
                io.to(currentRoomId).emit('queue_updated', {
                    queue: updated.queue,
                    currentVideo: updated.currentVideo,
                    playback: updated.playback,
                });
                const sysMsg = rooms_js_1.roomManager.addChatMessage(currentRoomId, {
                    userId: 'system',
                    userName: 'SyncPlay',
                    userAvatar: '⏭️',
                    text: `${currentUser.name} skipped to "${video.title}"`,
                    isSystem: true,
                });
                if (sysMsg) {
                    io.to(currentRoomId).emit('new_chat', sysMsg);
                }
            }
        });
        // Remove video from queue
        socket.on('remove_from_queue', ({ videoId }) => {
            if (!currentRoomId)
                return;
            const newQueue = rooms_js_1.roomManager.removeFromQueue(currentRoomId, videoId);
            if (newQueue) {
                io.to(currentRoomId).emit('queue_updated', {
                    queue: newQueue,
                });
            }
        });
        // Reorder queue
        socket.on('reorder_queue', ({ fromIndex, toIndex }) => {
            if (!currentRoomId)
                return;
            const newQueue = rooms_js_1.roomManager.reorderQueue(currentRoomId, fromIndex, toIndex);
            if (newQueue) {
                io.to(currentRoomId).emit('queue_updated', {
                    queue: newQueue,
                });
            }
        });
        // Current video ended -> auto-advance trigger
        socket.on('video_ended', () => {
            if (!currentRoomId)
                return;
            // Broadcast an auto-advance countdown to both viewers
            io.to(currentRoomId).emit('auto_advance_countdown', { seconds: 3 });
            setTimeout(() => {
                if (!currentRoomId)
                    return;
                const res = rooms_js_1.roomManager.playNext(currentRoomId);
                if (res) {
                    io.to(currentRoomId).emit('queue_updated', {
                        queue: res.room.queue,
                        currentVideo: res.room.currentVideo,
                        playback: res.room.playback,
                    });
                    if (res.nextVideo) {
                        const sysMsg = rooms_js_1.roomManager.addChatMessage(currentRoomId, {
                            userId: 'system',
                            userName: 'SyncPlay',
                            userAvatar: '🍿',
                            text: `Now playing next: "${res.nextVideo.title}"`,
                            isSystem: true,
                        });
                        if (sysMsg) {
                            io.to(currentRoomId).emit('new_chat', sysMsg);
                        }
                    }
                }
            }, 3000);
        });
        // Send chat message
        socket.on('send_chat', ({ text }) => {
            if (!currentRoomId || !currentUser || !text.trim())
                return;
            const newMsg = rooms_js_1.roomManager.addChatMessage(currentRoomId, {
                userId: currentUser.userId,
                userName: currentUser.name,
                userAvatar: currentUser.avatar,
                text: text.trim(),
            });
            if (newMsg) {
                io.to(currentRoomId).emit('new_chat', newMsg);
            }
        });
        // Floating reaction (hearts, laugh, etc.)
        socket.on('send_reaction', ({ emoji }) => {
            if (!currentRoomId)
                return;
            const userName = currentUser?.name || 'Partner';
            const userAvatar = currentUser?.avatar || '🐱';
            const reaction = {
                id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                emoji,
                userName,
                userAvatar,
                timestamp: Date.now(),
            };
            io.to(currentRoomId).emit('reaction_received', reaction);
        });
        // Typing status
        socket.on('typing_status', ({ isTyping }) => {
            if (!currentRoomId || !currentUser)
                return;
            socket.to(currentRoomId).emit('partner_typing', {
                userId: currentUser.userId,
                name: currentUser.name,
                isTyping,
            });
        });
        // Save current queue as playlist
        socket.on('save_playlist', ({ name, description }) => {
            if (!currentRoomId || !currentUser)
                return;
            const room = rooms_js_1.roomManager.getRoom(currentRoomId);
            if (!room)
                return;
            const allVideos = [];
            if (room.currentVideo)
                allVideos.push(room.currentVideo);
            allVideos.push(...room.queue);
            const playlist = {
                id: `pl_${Date.now()}`,
                name: name || 'Watch Playlist',
                description,
                videos: allVideos,
                createdAt: Date.now(),
                createdBy: currentUser.name,
            };
            database_js_1.db.savePlaylist(playlist);
            io.to(currentRoomId).emit('playlist_saved', playlist);
        });
        // Load saved playlist into queue
        socket.on('load_playlist', ({ playlistId }) => {
            if (!currentRoomId || !currentUser)
                return;
            const playlists = database_js_1.db.getPlaylists();
            const pl = playlists.find((p) => p.id === playlistId);
            if (!pl)
                return;
            for (const video of pl.videos) {
                const itemCopy = {
                    ...video,
                    id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    addedBy: currentUser.name,
                    addedAt: Date.now(),
                };
                rooms_js_1.roomManager.addToQueue(currentRoomId, itemCopy);
            }
            const updated = rooms_js_1.roomManager.getRoom(currentRoomId);
            if (updated) {
                io.to(currentRoomId).emit('queue_updated', {
                    queue: updated.queue,
                    currentVideo: updated.currentVideo,
                    playback: updated.playback,
                });
                const sysMsg = rooms_js_1.roomManager.addChatMessage(currentRoomId, {
                    userId: 'system',
                    userName: 'SyncPlay',
                    userAvatar: '📑',
                    text: `${currentUser.name} loaded playlist "${pl.name}" (${pl.videos.length} videos)`,
                    isSystem: true,
                });
                if (sysMsg) {
                    io.to(currentRoomId).emit('new_chat', sysMsg);
                }
            }
        });
        // Disconnect
        socket.on('disconnect', () => {
            if (currentRoomId) {
                const removed = rooms_js_1.roomManager.removeUser(currentRoomId, socket.id);
                if (removed) {
                    socket.to(currentRoomId).emit('user_left', { socketId: socket.id, user: removed });
                    const leaveMsg = rooms_js_1.roomManager.addChatMessage(currentRoomId, {
                        userId: 'system',
                        userName: 'SyncPlay',
                        userAvatar: '👋',
                        text: `${removed.name} left the room`,
                        isSystem: true,
                    });
                    if (leaveMsg) {
                        socket.to(currentRoomId).emit('new_chat', leaveMsg);
                    }
                }
            }
        });
    });
}
