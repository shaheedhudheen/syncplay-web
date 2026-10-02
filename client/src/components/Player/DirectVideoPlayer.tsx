import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PlaybackState, PlayerHandle } from '../../types';

interface DirectVideoPlayerProps {
  url: string;
  playback: PlaybackState;
  onPlaybackAction: (action: 'play' | 'pause' | 'seek' | 'rate', time: number, rate?: number) => void;
  onVideoEnded: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export const DirectVideoPlayer = forwardRef<PlayerHandle, DirectVideoPlayerProps>(function DirectVideoPlayer(
  { url, playback, onPlaybackAction, onVideoEnded, onTimeUpdate },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSyncingFromRemote = useRef<boolean>(false);

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (timeSeconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        isSyncingFromRemote.current = true;
        video.currentTime = Math.max(0, timeSeconds);
        if (playback.state === 'playing') {
          video.play().catch(() => {});
        }
        setTimeout(() => {
          isSyncingFromRemote.current = false;
        }, 1200);
      },
      play: () => {
        const video = videoRef.current;
        if (!video) return;
        isSyncingFromRemote.current = true;
        video.play().catch(() => {});
        setTimeout(() => {
          isSyncingFromRemote.current = false;
        }, 800);
      },
      pause: () => {
        const video = videoRef.current;
        if (!video) return;
        isSyncingFromRemote.current = true;
        video.pause();
        setTimeout(() => {
          isSyncingFromRemote.current = false;
        }, 800);
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getDuration: () => videoRef.current?.duration || 0,
      setVolume: (vol: number) => {
        if (!videoRef.current) return;
        videoRef.current.muted = false;
        videoRef.current.volume = Math.max(0, Math.min(1, vol / 100));
      },
      getVolume: () => {
        return videoRef.current ? Math.round(videoRef.current.volume * 100) : 100;
      },
      toggleMute: () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
      },
      isMuted: () => {
        return videoRef.current?.muted ?? false;
      },
    }),
    [playback.state]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playback.currentTime > 0) {
      video.currentTime = playback.currentTime;
    }
    if (playback.state === 'playing') {
      video.play().catch(() => {});
    }
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    isSyncingFromRemote.current = true;

    const transitElapsed =
      playback.state === 'playing' ? ((Date.now() - playback.lastUpdated) / 1000) * playback.playbackRate : 0;
    const targetTime = Math.max(0, playback.currentTime + transitElapsed);

    const drift = Math.abs(video.currentTime - targetTime);
    if (drift > 1.2) {
      video.currentTime = targetTime;
    }

    if (playback.state === 'playing') {
      video.play().catch(() => {});
    } else if (playback.state === 'paused' && !video.paused) {
      video.pause();
    }

    setTimeout(() => {
      isSyncingFromRemote.current = false;
    }, 1200);
  }, [playback.lastUpdated, playback.state, playback.currentTime]);

  const handlePlay = () => {
    if (isSyncingFromRemote.current || !videoRef.current) return;
    onPlaybackAction('play', videoRef.current.currentTime);
  };

  const handlePause = () => {
    if (isSyncingFromRemote.current || !videoRef.current) return;
    onPlaybackAction('pause', videoRef.current.currentTime);
  };

  const handleSeeked = () => {
    if (isSyncingFromRemote.current || !videoRef.current) return;
    isSyncingFromRemote.current = true;
    onPlaybackAction('seek', videoRef.current.currentTime);
    setTimeout(() => {
      isSyncingFromRemote.current = false;
    }, 800);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    onTimeUpdate?.(videoRef.current.currentTime, videoRef.current.duration || 0);
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        className="w-full h-full max-h-[75vh] object-contain"
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onVideoEnded}
      />
    </div>
  );
});
