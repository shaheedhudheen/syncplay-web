import { Check, FolderHeart, ListMusic, Play, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SavedPlaylist } from '../../types';

interface PlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPlaylist: (playlistId: string) => void;
}

export function PlaylistsModal({ isOpen, onClose, onLoadPlaylist }: PlaylistsModalProps) {
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SavedPlaylist | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/playlists')
        .then((res) => res.json())
        .then((data) => setPlaylists(data.playlists || []))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
    } catch {
      // ignore
    }
  };

  const handleLoad = (id: string) => {
    onLoadPlaylist(id);
    setLoadedId(id);
    setTimeout(() => {
      onClose();
      setLoadedId(null);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center">
            <FolderHeart className="w-5 h-5 mr-2 text-rose-500" />
            Saved Playlists
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <ListMusic className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No saved playlists yet.</p>
              <p className="text-xs text-slate-600 mt-1">
                You can save your active queue as a playlist anytime from the Queue tab!
              </p>
            </div>
          ) : (
            playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylist(selectedPlaylist?.id === pl.id ? null : pl)}
                className="p-3 bg-slate-950/70 hover:bg-slate-800/80 rounded-xl border border-slate-800 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white">{pl.name}</h4>
                    <p className="text-xs text-slate-400">
                      {pl.videos.length} videos • Saved by {pl.createdBy}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoad(pl.id);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center transition-colors"
                    >
                      {loadedId === pl.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Loaded!
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 mr-1" />
                          Load to Queue
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDelete(pl.id, e)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Video List Preview */}
                {selectedPlaylist?.id === pl.id && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Videos in this playlist:</p>
                    {pl.videos.map((vid, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs text-slate-300">
                        <span className="text-slate-500 w-4">{i + 1}.</span>
                        {vid.thumbnail && (
                          <img src={vid.thumbnail} alt="" className="w-8 h-5 object-cover rounded" />
                        )}
                        <span className="truncate flex-1">{vid.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
