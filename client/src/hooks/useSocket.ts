import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, FloatingReaction, PlaybackState, PlayerActivityItem, RoomState, RoomUser, UserProfile, VideoItem } from '../types';
import { triggerEmojiConfetti } from '../utils/confetti';

export function useSocket(roomId: string | null, user: UserProfile, customName?: string) {
  const [connected, setConnected] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [recentActivity, setRecentActivity] = useState<PlayerActivityItem | null>(null);
  const [activeReactions, setActiveReactions] = useState<FloatingReaction[]>([]);
  const [typingPartners, setTypingPartners] = useState<string[]>([]);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const countdownTimerRef = useRef<any>(null);
  const activityTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId) return;

    // Connect to server (using current host or dev proxy)
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', {
        roomId,
        user,
        customName,
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room_state', (state: RoomState) => {
      setRoomState(state);
    });

    socket.on('sync_playback', (playback: PlaybackState) => {
      setRoomState((prev) => (prev ? { ...prev, playback } : null));
    });

    socket.on('queue_updated', (data: { queue: VideoItem[]; currentVideo?: VideoItem | null; playback?: PlaybackState }) => {
      setRoomState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          queue: data.queue,
          ...(data.currentVideo !== undefined ? { currentVideo: data.currentVideo } : {}),
          ...(data.playback !== undefined ? { playback: data.playback } : {}),
        };
      });
      setAutoAdvanceCountdown(null);
    });

    socket.on('new_chat', (msg: ChatMessage) => {
      setRoomState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, msg],
        };
      });
    });

    socket.on('user_joined', (roomUser: RoomUser) => {
      setRoomState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          users: { ...prev.users, [roomUser.socketId]: roomUser },
        };
      });
    });

    socket.on('user_left', ({ socketId }: { socketId: string }) => {
      setRoomState((prev) => {
        if (!prev) return null;
        const newUsers = { ...prev.users };
        delete newUsers[socketId];
        return {
          ...prev,
          users: newUsers,
        };
      });
    });

    socket.on('reaction_received', (reaction: FloatingReaction) => {
      triggerEmojiConfetti(reaction.emoji);
      setActiveReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    });

    socket.on('partner_typing', ({ name, isTyping }: { name: string; isTyping: boolean }) => {
      setTypingPartners((prev) => {
        if (isTyping) {
          return prev.includes(name) ? prev : [...prev, name];
        } else {
          return prev.filter((n) => n !== name);
        }
      });
    });

    socket.on('auto_advance_countdown', ({ seconds }: { seconds: number }) => {
      setAutoAdvanceCountdown(seconds);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      let remaining = seconds;
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current);
          setAutoAdvanceCountdown(null);
        } else {
          setAutoAdvanceCountdown(remaining);
        }
      }, 1000);
    });

    socket.on('player_activity', (activity: PlayerActivityItem) => {
      setRecentActivity(activity);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      activityTimerRef.current = setTimeout(() => {
        setRecentActivity(null);
      }, 3500);

      setRoomState((prev) => {
        if (!prev) return null;
        const currentLog = prev.activityLog || [];
        return {
          ...prev,
          activityLog: [...currentLog, activity].slice(-50),
        };
      });
    });

    socket.on('error_message', ({ message }: { message: string }) => {
      setErrorToast(message);
      setTimeout(() => setErrorToast(null), 4000);
    });

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      socket.disconnect();
    };
  }, [roomId, user.userId, customName]);

  // Actions
  const sendPlaybackAction = useCallback(
    (action: 'play' | 'pause' | 'seek' | 'rate', currentTime: number, playbackRate: number = 1) => {
      socketRef.current?.emit('playback_action', { action, currentTime, playbackRate });
    },
    []
  );

  const requestSync = useCallback(() => {
    socketRef.current?.emit('request_sync');
  }, []);

  const addToQueue = useCallback((input: string) => {
    socketRef.current?.emit('add_to_queue', { input });
  }, []);

  const playQueuedVideo = useCallback((video: VideoItem) => {
    socketRef.current?.emit('play_queued_video', { video });
  }, []);

  const removeFromQueue = useCallback((videoId: string) => {
    socketRef.current?.emit('remove_from_queue', { videoId });
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    socketRef.current?.emit('reorder_queue', { fromIndex, toIndex });
  }, []);

  const notifyVideoEnded = useCallback(() => {
    socketRef.current?.emit('video_ended');
  }, []);

  const sendChat = useCallback((text: string) => {
    socketRef.current?.emit('send_chat', { text });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    triggerEmojiConfetti(emoji);
    socketRef.current?.emit('send_reaction', { emoji });
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.emit('typing_status', { isTyping });
  }, []);

  const savePlaylist = useCallback((name: string, description?: string) => {
    socketRef.current?.emit('save_playlist', { name, description });
  }, []);

  const loadPlaylist = useCallback((playlistId: string) => {
    socketRef.current?.emit('load_playlist', { playlistId });
  }, []);

  return {
    connected,
    roomState,
    recentActivity,
    activeReactions,
    typingPartners,
    autoAdvanceCountdown,
    errorToast,
    actions: {
      sendPlaybackAction,
      requestSync,
      addToQueue,
      playQueuedVideo,
      removeFromQueue,
      reorderQueue,
      notifyVideoEnded,
      sendChat,
      sendReaction,
      setTyping,
      savePlaylist,
      loadPlaylist,
    },
  };
}
