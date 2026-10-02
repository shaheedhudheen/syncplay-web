import { ChevronDown, ChevronUp, FolderPlus, ListPlus, Play, Trash2 } from 'lucide-react';
import type { VideoItem } from '../../types';

interface QueueListProps {
  currentVideo: VideoItem | null;
  queue: VideoItem[];
  onPlayQueuedVideo: (video: VideoItem) => void;
  onRemoveFromQueue: (videoId: string) => void;
  onReorderQueue: (fromIndex: number, toIndex: number) => void;
  onOpenAddModal: () => void;
  onOpenSavePlaylistModal: () => void;
}

export function QueueList({
  currentVideo,
  queue,
  onPlayQueuedVideo,
  onRemoveFromQueue,
  onReorderQueue,
  onOpenAddModal,
  onOpenSavePlaylistModal,
}: QueueListProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center">
            Video Queue
            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-800 text-rose-400 rounded-full font-normal">
              {queue.length}
            </span>
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {queue.length > 0 && (
            <button
              onClick={onOpenSavePlaylistModal}
              title="Save queue as playlist"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center"
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Save
            </button>
          )}
          <button
            onClick={onOpenAddModal}
            className="flex items-center text-xs px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-all shadow-sm"
          >
            <ListPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Video
          </button>
        </div>
      </div>

      {/* Currently Playing Card */}
      {currentVideo && (
        <div className="p-3 bg-rose-950/20 border-b border-rose-900/20">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-2 flex items-center">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mr-1.5" />
            Now Playing
          </div>
          <div className="flex space-x-3 items-center">
            {currentVideo.thumbnail && (
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-16 h-10 object-cover rounded-lg flex-shrink-0 border border-rose-500/20"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-white truncate">{currentVideo.title}</h4>
              <p className="text-[11px] text-slate-400 truncate">
                {currentVideo.channelTitle || 'Video'} • Added by {currentVideo.addedBy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Items Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <p className="text-xs mb-3">Your queue is empty</p>
            <button
              onClick={onOpenAddModal}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium underline"
            >
              + Add a video to queue
            </button>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center space-x-2.5 p-2.5 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-all group"
            >
              <span className="text-xs font-bold text-slate-500 w-4 text-center">
                {index + 1}
              </span>

              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-14 h-9 object-cover rounded-lg flex-shrink-0"
                />
              )}

              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-medium text-slate-200 truncate group-hover:text-rose-300 transition-colors">
                  {item.title}
                </h5>
                <p className="text-[10px] text-slate-400 truncate">
                  {item.channelTitle || 'YouTube'} • by {item.addedBy}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-75 group-hover:opacity-100 transition-opacity">
                {/* Reorder Up */}
                {index > 0 && (
                  <button
                    onClick={() => onReorderQueue(index, index - 1)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Reorder Down */}
                {index < queue.length - 1 && (
                  <button
                    onClick={() => onReorderQueue(index, index + 1)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Play Now */}
                <button
                  onClick={() => onPlayQueuedVideo(item)}
                  className="p-1 text-emerald-400 hover:text-emerald-300 rounded hover:bg-slate-700 transition-colors"
                  title="Play immediately"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>

                {/* Remove */}
                <button
                  onClick={() => onRemoveFromQueue(item.id)}
                  className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-700 transition-colors"
                  title="Remove from queue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
