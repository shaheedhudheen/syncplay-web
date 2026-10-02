import { History, ListPlus, X } from 'lucide-react';
import type { WatchHistoryItem } from '../../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: WatchHistoryItem[];
  onAddVideoToQueue: (url: string) => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  history,
  onAddVideoToQueue,
}: HistoryModalProps) {
  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center">
            <History className="w-5 h-5 mr-2 text-rose-500" />
            Watch History
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <History className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No watch history yet.</p>
              <p className="text-xs text-slate-600 mt-1">
                Videos you finish watching together will appear here!
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-2.5 bg-slate-950/70 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all"
              >
                {item.video.thumbnail && (
                  <img
                    src={item.video.thumbnail}
                    alt={item.video.title}
                    className="w-18 h-11 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate">{item.video.title}</h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    {item.video.channelTitle || 'Video'} • Watched {formatDate(item.watchedAt)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onAddVideoToQueue(item.video.url);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center flex-shrink-0"
                  title="Re-add to queue"
                >
                  <ListPlus className="w-3.5 h-3.5 mr-1" />
                  Queue
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
