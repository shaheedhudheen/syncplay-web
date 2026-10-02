import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PlaybackState, PlayerHandle } from '../../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  playback: PlaybackState;
  onPlaybackAction: (action: 'play' | 'pause' | 'seek' | 'rate', time: number, rate?: number) => void;
  onVideoEnded: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export const YouTubePlayer = forwardRef<PlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
  { videoId, playback, onPlaybackAction, onVideoEnded, onTimeUpdate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Keep fresh ref to playback to avoid stale closures in event handlers and callbacks
  const playbackRef = useRef<PlaybackState>(playback);
  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  // Synchronization flags & locks
  const isSyncingFromRemote = useRef<boolean>(false);
  const isSeekingRecently = useRef<number>(0);
  const syncLockTimeoutRef = useRef<any>(null);
  const lastStateSent = useRef<'playing' | 'paused' | null>(null);

  // Time & seek tracking
  const lastStableTime = useRef<number>(playback.currentTime || 0);
  const lastPollTime = useRef<number>(Date.now());
  const seekBaselineTime = useRef<number>(playback.currentTime || 0);
  const isBuffering = useRef<boolean>(false);
  const pollIntervalRef = useRef<any>(null);

  const lockRemoteSync = (durationMs: number = 2500) => {
    isSyncingFromRemote.current = true;
    if (syncLockTimeoutRef.current) clearTimeout(syncLockTimeoutRef.current);
    syncLockTimeoutRef.current = setTimeout(() => {
      isSyncingFromRemote.current = false;
    }, durationMs);
  };

  // Expose player methods to parent (for custom scrubber, -10s, +10s, play/pause)
  useImperativeHandle(
    ref,
    () => ({
      seekTo: (timeSeconds: number) => {
        const player = playerRef.current;
        if (!player || typeof player.seekTo !== 'function') return;

        const target = Math.max(0, timeSeconds);
        lockRemoteSync(2500);
        isSeekingRecently.current = Date.now();
        lastStableTime.current = target;
        lastPollTime.current = Date.now();
        player.seekTo(target, true);

        // If the room state is playing, ensure YouTube continues playing
        if (playbackRef.current.state === 'playing') {
          lastStateSent.current = 'playing';
          player.playVideo();
        }
      },
      play: () => {
        const player = playerRef.current;
        if (!player || typeof player.playVideo !== 'function') return;
        lockRemoteSync(1000);
        lastStateSent.current = 'playing';
        player.playVideo();
      },
      pause: () => {
        const player = playerRef.current;
        if (!player || typeof player.pauseVideo !== 'function') return;
        lockRemoteSync(1000);
        lastStateSent.current = 'paused';
        player.pauseVideo();
      },
      getCurrentTime: () => {
        const player = playerRef.current;
        if (!player || typeof player.getCurrentTime !== 'function') return lastStableTime.current || 0;
        // If we recently commanded a seek and YouTube is still buffering/seeking, return lastStableTime
        if (Date.now() - isSeekingRecently.current < 2500 && lastStableTime.current > 0) {
          const ytTime = player.getCurrentTime() || 0;
          if (Math.abs(ytTime - lastStableTime.current) > 1.2) {
            return lastStableTime.current;
          }
        }
        return player.getCurrentTime() || 0;
      },
      getDuration: () => {
        const player = playerRef.current;
        return player && typeof player.getDuration === 'function' ? player.getDuration() : 0;
      },
      setVolume: (volume: number) => {
        const player = playerRef.current;
        if (!player) return;
        if (typeof player.unMute === 'function') player.unMute();
        if (typeof player.setVolume === 'function') player.setVolume(Math.max(0, Math.min(100, volume)));
      },
      getVolume: () => {
        const player = playerRef.current;
        return player && typeof player.getVolume === 'function' ? player.getVolume() : 100;
      },
      toggleMute: () => {
        const player = playerRef.current;
        if (!player) return;
        if (typeof player.isMuted === 'function' && player.isMuted()) {
          player.unMute();
        } else if (typeof player.mute === 'function') {
          player.mute();
        }
      },
      isMuted: () => {
        const player = playerRef.current;
        return player && typeof player.isMuted === 'function' ? player.isMuted() : false;
      },
    }),
    []
  );

  // Initialize YouTube Iframe API
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!containerRef.current || !window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: playback.state === 'playing' ? 1 : 0,
          controls: 1,
          fs: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            const p = event.target;

            if (playback.currentTime > 0) {
              p.seekTo(playback.currentTime, true);
            }

            if (playback.state === 'playing') {
              p.playVideo();
            } else {
              p.pauseVideo();
            }

            lastStableTime.current = playback.currentTime;
            lastPollTime.current = Date.now();
            if (p.getDuration && onTimeUpdate) {
              const dur = p.getDuration();
              if (dur > 0) onTimeUpdate(playback.currentTime, dur);
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            const player = event.target;
            const state = event.data;

            // 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING
            if (state === 0) {
              onVideoEnded();
              return;
            }

            // Track buffering transitions (indicator of YouTube video seeking or chunk loading)
            if (state === 3) {
              seekBaselineTime.current = lastStableTime.current;
              isBuffering.current = true;
              return;
            }

            const isRecentSeek = Date.now() - isSeekingRecently.current < 2500;

            // If buffering finished, check if time jumped significantly (e.g. user scrubbed native seekbar)
            if (isBuffering.current && (state === 1 || state === 2)) {
              isBuffering.current = false;
              if (!isSyncingFromRemote.current) {
                const curr = player.getCurrentTime ? player.getCurrentTime() : 0;
                const diff = Math.abs(curr - seekBaselineTime.current);
                if (diff > 0.8) {
                  lockRemoteSync(2500);
                  isSeekingRecently.current = Date.now();
                  lastStableTime.current = curr;
                  lastPollTime.current = Date.now();
                  onPlaybackAction('seek', curr);

                  // If room is supposed to be playing, keep playing
                  if (playbackRef.current.state === 'playing') {
                    lastStateSent.current = 'playing';
                    player.playVideo();
                  }
                  return;
                }
              }
            }

            // If handling remote sync or recent seek, ignore play/pause emission
            if (isSyncingFromRemote.current || isRecentSeek) {
              // If the room should be playing but YouTube dropped into paused (state 2) due to seek/buffer, resume!
              if (playbackRef.current.state === 'playing' && state === 2) {
                lastStateSent.current = 'playing';
                player.playVideo();
              }
              return;
            }

            const currTime = player.getCurrentTime ? player.getCurrentTime() : 0;
            const timeJump = Math.abs(currTime - lastStableTime.current);
            lastStableTime.current = currTime;
            lastPollTime.current = Date.now();

            if (state === 1) {
              if (lastStateSent.current !== 'playing') {
                lastStateSent.current = 'playing';
                onPlaybackAction('play', currTime);
              }
            } else if (state === 2) {
              // If time jumped (> 1.2s), user clicked/scrubbed native seekbar directly without buffering state 3
              if (timeJump > 1.2) {
                lockRemoteSync(2500);
                isSeekingRecently.current = Date.now();
                onPlaybackAction('seek', currTime);
                if (playbackRef.current.state === 'playing') {
                  lastStateSent.current = 'playing';
                  player.playVideo();
                }
                return;
              }

              // Genuine pause: user clicked pause on player
              if (lastStateSent.current !== 'paused') {
                lastStateSent.current = 'paused';
                onPlaybackAction('pause', currTime);
              }
            }
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) initPlayer();
      };
      document.body.appendChild(tag);
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (syncLockTimeoutRef.current) clearTimeout(syncLockTimeoutRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [videoId]);

  // High-Frequency Poller to detect scrubbing, timeline clicks, or arrow key seeking
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function' || typeof player.getPlayerState !== 'function') {
        return;
      }

      const currTime = player.getCurrentTime();
      const duration = player.getDuration ? player.getDuration() : 0;
      onTimeUpdate?.(currTime, duration);

      const isRecentSeek = Date.now() - isSeekingRecently.current < 2500;
      if (isSyncingFromRemote.current || isBuffering.current || isRecentSeek) {
        lastStableTime.current = currTime;
        lastPollTime.current = Date.now();
        return;
      }

      const state = player.getPlayerState();
      const now = Date.now();
      const elapsed = (now - lastPollTime.current) / 1000;

      if (state === 1) {
        // Playing
        const rate = player.getPlaybackRate ? player.getPlaybackRate() : 1;
        const expected = lastStableTime.current + elapsed * rate;
        const jump = Math.abs(currTime - expected);

        if (jump > 1.2) {
          lockRemoteSync(2500);
          isSeekingRecently.current = now;
          lastStableTime.current = currTime;
          lastPollTime.current = now;
          onPlaybackAction('seek', currTime);
        } else {
          lastStableTime.current = currTime;
          lastPollTime.current = now;
        }
      } else if (state === 2) {
        // Paused
        const jump = Math.abs(currTime - lastStableTime.current);
        if (jump > 1.2) {
          lockRemoteSync(2500);
          isSeekingRecently.current = now;
          lastStableTime.current = currTime;
          lastPollTime.current = now;
          onPlaybackAction('seek', currTime);
        } else {
          lastStableTime.current = currTime;
          lastPollTime.current = now;
        }
      }
    }, 250);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [onPlaybackAction, onTimeUpdate]);

  // Sync incoming remote playback updates
  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof player.getPlayerState !== 'function' || typeof player.getCurrentTime !== 'function') {
      return;
    }

    try {
      const now = Date.now();
      const transitElapsed =
        playback.state === 'playing' ? ((now - playback.lastUpdated) / 1000) * playback.playbackRate : 0;
      const targetTime = Math.max(0, playback.currentTime + transitElapsed);

      const localTime = player.getCurrentTime();
      const localState = player.getPlayerState();
      const drift = Math.abs(localTime - targetTime);

      // Check if we are already targeting this time locally (avoid echo seeks if this client initiated the action)
      const isAlreadyTargeted = Math.abs(lastStableTime.current - targetTime) < 1.0;
      const needsSeek = !isAlreadyTargeted && drift > 1.0;

      const isPlayingOrBuffering = localState === 1 || localState === 3;
      const needsPlay = playback.state === 'playing' && localState !== 1;
      const needsPause = playback.state === 'paused' && isPlayingOrBuffering;

      if (needsSeek || needsPlay || needsPause) {
        lockRemoteSync(2500);

        if (needsSeek) {
          isSeekingRecently.current = Date.now();
          player.seekTo(targetTime, true);
        }

        // CRITICAL FIX: Whenever playback.state is 'playing', ALWAYS ensure playVideo() is called!
        // Seeking in YouTube can transition state to buffering/paused, so if playback is 'playing',
        // we must explicitly call playVideo() whether needsSeek was true or needsPlay was true.
        if (playback.state === 'playing') {
          lastStateSent.current = 'playing';
          player.playVideo();
        } else if (playback.state === 'paused') {
          lastStateSent.current = 'paused';
          player.pauseVideo();
        }

        lastStableTime.current = targetTime;
        lastPollTime.current = Date.now();
      }
    } catch {
      isSyncingFromRemote.current = false;
    }
  }, [playback.lastUpdated, playback.state, playback.currentTime]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full aspect-video" />
    </div>
  );
});
