import { Film, Plus } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { FloatingReaction, PlaybackState, PlayerActivityItem, PlayerHandle, VideoItem } from '../../types';
import { FloatingReactionsOverlay } from '../Reactions/FloatingReactionsOverlay';
import { DirectVideoPlayer } from './DirectVideoPlayer';
import { YouTubePlayer } from './YouTubePlayer';

interface VideoPlayerProps {
  currentVideo: VideoItem | null;
  playback: PlaybackState;
  connected: boolean;
  reactions: FloatingReaction[];
  autoAdvanceCountdown: number | null;
  recentActivity?: PlayerActivityItem | null;
  onPlaybackAction: (action: 'play' | 'pause' | 'seek' | 'rate', time: number, rate?: number) => void;
  onVideoEnded: () => void;
  onRequestSync: () => void;
  onOpenAddModal: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export const VideoPlayer = forwardRef<PlayerHandle, VideoPlayerProps>(function VideoPlayer(
  {
    currentVideo,
    playback,
    reactions,
    autoAdvanceCountdown,
    recentActivity,
    onPlaybackAction,
    onVideoEnded,
    onOpenAddModal,
    onTimeUpdate,
  },
  ref
) {
  const activePlayerRef = useRef<PlayerHandle>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Forward ref so parent RoomView can control local playback & volume
  useImperativeHandle(
    ref,
    () => ({
      seekTo: (timeSeconds: number) => {
        activePlayerRef.current?.seekTo(timeSeconds);
        setCurrentTime(timeSeconds);
      },
      play: () => {
        activePlayerRef.current?.play();
      },
      pause: () => {
        activePlayerRef.current?.pause();
      },
      getCurrentTime: () => activePlayerRef.current?.getCurrentTime() ?? currentTime,
      getDuration: () => activePlayerRef.current?.getDuration() ?? duration,
      setVolume: (vol: number) => {
        activePlayerRef.current?.setVolume?.(vol);
      },
      getVolume: () => activePlayerRef.current?.getVolume?.() ?? 100,
      toggleMute: () => {
        activePlayerRef.current?.toggleMute?.();
      },
      isMuted: () => activePlayerRef.current?.isMuted?.() ?? false,
    }),
    [currentTime, duration]
  );

  // Sync local currentTime when authoritative playback state updates
  useEffect(() => {
    if (playback.currentTime >= 0) {
      setCurrentTime(playback.currentTime);
    }
  }, [playback.currentTime, playback.lastUpdated]);

  // Periodic time updates from active player
  const handleTimeUpdate = (time: number, dur: number) => {
    setCurrentTime(time);
    if (dur > 0) {
      setDuration(dur);
    }
    onTimeUpdate?.(time, dur);
  };

  // Synchronized Play / Pause Toggle
  const handleTogglePlayPause = () => {
    const curr = activePlayerRef.current?.getCurrentTime() ?? currentTime;
    if (playback.state === 'playing') {
      activePlayerRef.current?.pause();
      onPlaybackAction('pause', curr);
    } else {
      activePlayerRef.current?.play();
      onPlaybackAction('play', curr);
    }
  };

  // Synchronized Skip By Seconds (-10s / +10s)
  const handleSkip = (deltaSeconds: number) => {
    const curr = activePlayerRef.current?.getCurrentTime() ?? currentTime;
    const target = Math.max(0, Math.min(duration || 99999, curr + deltaSeconds));
    setCurrentTime(target);
    activePlayerRef.current?.seekTo(target);
    onPlaybackAction('seek', target);
  };

  // Global Keyboard Shortcuts (Space, ArrowLeft, ArrowRight, J, L, K)
  const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handleKeyDownRef.current = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handleTogglePlayPause();
    } else if (e.code === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
      e.preventDefault();
      handleSkip(-10);
    } else if (e.code === 'ArrowRight' || e.key.toLowerCase() === 'l') {
      e.preventDefault();
      handleSkip(10);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      id="cinema-stage-container"
      className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-center items-center group select-none"
    >
      {/* Floating Reactions Overlay */}
      <FloatingReactionsOverlay reactions={reactions} />

      {/* Floating Cinema HUD Activity Toast */}
      {recentActivity && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs font-semibold text-white">
            <span className="text-sm">
              {recentActivity.action === 'pause'
                ? '⏸️'
                : recentActivity.action === 'seek'
                ? '⏱️'
                : recentActivity.action === 'video_change'
                ? '🎬'
                : '▶️'}
            </span>
            <span>{recentActivity.text}</span>
          </div>
        </div>
      )}

      {/* Active Video Player */}
      {currentVideo ? (
        <div className="relative w-full h-full">
          {currentVideo.source === 'youtube' && currentVideo.videoId ? (
            <YouTubePlayer
              ref={activePlayerRef}
              videoId={currentVideo.videoId}
              playback={playback}
              onPlaybackAction={onPlaybackAction}
              onVideoEnded={onVideoEnded}
              onTimeUpdate={handleTimeUpdate}
            />
          ) : (
            <DirectVideoPlayer
              ref={activePlayerRef}
              url={currentVideo.url}
              playback={playback}
              onPlaybackAction={onPlaybackAction}
              onVideoEnded={onVideoEnded}
              onTimeUpdate={handleTimeUpdate}
            />
          )}

          {/* Auto Advance Countdown Overlay */}
          {autoAdvanceCountdown !== null && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-30 animate-in fade-in">
              <span className="text-5xl font-black text-rose-500 mb-3 animate-bounce">
                {autoAdvanceCountdown}
              </span>
              <p className="text-lg font-semibold text-white">Playing next video in queue...</p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Video Playing</h3>
          <p className="text-slate-400 text-sm mb-6">
            Paste a YouTube link or search for a video to start your synchronized watch party together!
          </p>
          <button
            onClick={onOpenAddModal}
            className="flex items-center px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-xl shadow-lg shadow-rose-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Video
          </button>
        </div>
      )}
    </div>
  );
});
