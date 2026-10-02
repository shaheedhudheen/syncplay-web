import {
  Activity,
  ArrowLeft,
  Check,
  Copy,
  FolderHeart,
  History,
  MessageSquare,
  Plus,
  RefreshCw,
  Tv,
  Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import type { PlayerHandle, UserProfile } from '../../types';
import { ActivityFeed } from '../Activity/ActivityFeed';
import { AddVideoModal } from '../AddVideo/AddVideoModal';
import { ChatBox } from '../Chat/ChatBox';
import { HistoryModal } from '../History/HistoryModal';
import { VideoPlayer } from '../Player/VideoPlayer';
import { PlaylistsModal } from '../Playlists/PlaylistsModal';
import { SavePlaylistModal } from '../Playlists/SavePlaylistModal';
import { QueueList } from '../Queue/QueueList';

interface RoomViewProps {
  roomId: string;
  roomName?: string;
  user: UserProfile;
  onLeaveRoom: () => void;
}

export function RoomView({ roomId, roomName, user, onLeaveRoom }: RoomViewProps) {
  const {
    connected,
    roomState,
    recentActivity,
    activeReactions,
    typingPartners,
    autoAdvanceCountdown,
    errorToast,
    actions,
  } = useSocket(roomId, user, roomName);

  const videoPlayerRef = useRef<PlayerHandle>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'queue' | 'activity'>('chat');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPlaylistsModalOpen, setIsPlaylistsModalOpen] = useState(false);
  const [isSavePlaylistModalOpen, setIsSavePlaylistModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const usersList = roomState ? Object.values(roomState.users) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <button
            onClick={onLeaveRoom}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Leave room and return home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xl">🍿</span>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                {roomState?.name || roomName || 'SyncPlay Room'}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-slate-400">#{roomId}</span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center text-[11px] text-slate-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {connected ? 'Live Sync' : 'Reconnecting...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-2.5">
          {/* Copy Room Link Button */}
          <button
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center transition-all ${
              copiedLink
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Partner Link
              </>
            )}
          </button>

          {/* Connected Users Avatars */}
          <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl">
            <Users className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <div className="flex -space-x-1.5 overflow-hidden">
              {usersList.map((u) => (
                <div
                  key={u.socketId}
                  title={`${u.name} (Online)`}
                  className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs shadow"
                >
                  {u.avatar}
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-400 ml-1.5">
              {usersList.length}
            </span>
          </div>

          {/* Quick Action Modals */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Watch History"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaylistsModalOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Saved Playlists"
          >
            <FolderHeart className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center transition-all"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Video
          </button>
        </div>
      </header>

      {/* Error Toast */}
      {errorToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in">
          {errorToast}
        </div>
      )}

      {/* Main Room Layout: Player & Sidebar */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4 max-w-[1700px] w-full mx-auto overflow-x-hidden lg:overflow-hidden">
        {/* Left: Video Player Cinema Section */}
        <div className="flex-1 flex flex-col min-w-0">
          <VideoPlayer
            ref={videoPlayerRef}
            currentVideo={roomState?.currentVideo || null}
            playback={
              roomState?.playback || {
                state: 'paused',
                currentTime: 0,
                playbackRate: 1,
                lastUpdated: Date.now(),
                updatedBy: 'System',
              }
            }
            connected={connected}
            reactions={activeReactions}
            autoAdvanceCountdown={autoAdvanceCountdown}
            recentActivity={recentActivity}
            onPlaybackAction={actions.sendPlaybackAction}
            onVideoEnded={actions.notifyVideoEnded}
            onRequestSync={actions.requestSync}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />

          {/* Under-player Video Info & Live Sync Status Bar */}
          {roomState?.currentVideo && (
            <div className="mt-3 p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-lg">
              <div className="min-w-0 flex-1 mr-4">
                <h3 className="text-base font-bold text-white truncate">
                  {roomState.currentVideo.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {roomState.currentVideo.channelTitle || 'YouTube'} • Added by{' '}
                  <span className="text-rose-400 font-medium">
                    {roomState.currentVideo.addedBy}
                  </span>
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                {recentActivity ? (
                  <span className="flex items-center text-xs font-semibold text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30 animate-in fade-in shadow-sm">
                    <span className="mr-1.5">
                      {recentActivity.action === 'pause'
                        ? '⏸️'
                        : recentActivity.action === 'seek'
                        ? '⏱️'
                        : recentActivity.action === 'video_change'
                        ? '🎬'
                        : '▶️'}
                    </span>
                    <span className="truncate max-w-[200px] sm:max-w-xs">{recentActivity.text}</span>
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-medium text-slate-300 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                    In Sync
                  </span>
                )}

                <button
                  onClick={() => actions.requestSync()}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700/60 transition-colors flex items-center cursor-pointer"
                  title="Force re-sync playback with partner"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Re-sync
                </button>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Video
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar (Chat, Queue, and Activity) */}
        <div className="w-full lg:w-[400px] xl:w-[440px] flex flex-col h-[550px] lg:h-[calc(100vh-6rem)] flex-shrink-0">
          {/* Tab buttons */}
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800 mb-3">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                activeTab === 'chat'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Chat
              {roomState && roomState.chatMessages.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
                  {roomState.chatMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                activeTab === 'queue'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 mr-1.5" />
              Queue
              {roomState && roomState.queue.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
                  {roomState.queue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                activeTab === 'activity'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Activity
              {roomState && roomState.activityLog && roomState.activityLog.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
                  {roomState.activityLog.length}
                </span>
              )}
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <ChatBox
                messages={roomState?.chatMessages || []}
                currentUser={user}
                typingPartners={typingPartners}
                onSendMessage={actions.sendChat}
                onSendReaction={actions.sendReaction}
                onTypingStatus={actions.setTyping}
              />
            ) : activeTab === 'queue' ? (
              <QueueList
                currentVideo={roomState?.currentVideo || null}
                queue={roomState?.queue || []}
                onPlayQueuedVideo={actions.playQueuedVideo}
                onRemoveFromQueue={actions.removeFromQueue}
                onReorderQueue={actions.reorderQueue}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onOpenSavePlaylistModal={() => setIsSavePlaylistModalOpen(true)}
              />
            ) : (
              <ActivityFeed activities={roomState?.activityLog || []} />
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddVideoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddVideo={actions.addToQueue}
      />

      <PlaylistsModal
        isOpen={isPlaylistsModalOpen}
        onClose={() => setIsPlaylistsModalOpen(false)}
        onLoadPlaylist={actions.loadPlaylist}
      />

      <SavePlaylistModal
        isOpen={isSavePlaylistModalOpen}
        onClose={() => setIsSavePlaylistModalOpen(false)}
        onSave={actions.savePlaylist}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={roomState?.history || []}
        onAddVideoToQueue={actions.addToQueue}
      />
    </div>
  );
}
