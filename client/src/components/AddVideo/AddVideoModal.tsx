import { Clipboard, Film, Link as LinkIcon, Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVideo: (url: string) => void;
}

const SAMPLE_VIDEOS = [
  {
    title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    channel: 'Lofi Girl',
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
  },
  {
    title: 'Cozy Fireplace 4K with Crackling Fire Sounds',
    url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
    channel: 'Fireplace 4K',
    thumbnail: 'https://img.youtube.com/vi/L_LUpnjgPso/hqdefault.jpg',
  },
  {
    title: 'Big Buck Bunny (Direct 4K MP4 Stream)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    channel: 'Blender Foundation',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=60',
  },
];

export function AddVideoModal({ isOpen, onClose, onAddVideo }: AddVideoModalProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'search' | 'samples'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  if (!isOpen) return null;

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    onAddVideo(urlInput.trim());
    setUrlInput('');
    setPreviewVideo(null);
    onClose();
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        fetchPreview(text);
      }
    } catch {
      // Clipboard access denied
    }
  };

  const fetchPreview = async (url: string) => {
    if (!url.trim().startsWith('http')) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/resolve?url=${encodeURIComponent(url.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewVideo(data.video);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSample = (url: string) => {
    onAddVideo(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center">
            <Film className="w-5 h-5 mr-2 text-rose-500" />
            Add Video to Queue
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-4 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('url')}
            className={`py-3 px-4 text-xs font-semibold flex items-center border-b-2 transition-all ${
              activeTab === 'url'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
            Paste Video URL
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-4 text-xs font-semibold flex items-center border-b-2 transition-all ${
              activeTab === 'search'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            Search YouTube
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`py-3 px-4 text-xs font-semibold flex items-center border-b-2 transition-all ${
              activeTab === 'samples'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Quick Demos
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* TAB 1: Paste URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  YouTube Link or Direct Video (.mp4 / .webm)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      fetchPreview(e.target.value);
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-500 text-sm px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center transition-colors"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5 mr-1.5" />
                    Paste
                  </button>
                </div>
              </div>

              {/* Preview Card */}
              {isLoadingPreview && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-center text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-rose-500" />
                  Resolving video title...
                </div>
              )}

              {previewVideo && (
                <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/30 flex space-x-3 items-center">
                  {previewVideo.thumbnail && (
                    <img
                      src={previewVideo.thumbnail}
                      alt={previewVideo.title}
                      className="w-20 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white truncate">{previewVideo.title}</h4>
                    <p className="text-[11px] text-slate-400">{previewVideo.channelTitle || 'YouTube'}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add to Queue
              </button>
            </form>
          )}

          {/* TAB 2: Search YouTube */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search music, shows, trailers, vlogs..."
                  className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-500 text-sm px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center transition-all"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </form>

              {/* Search Results */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={item.videoId}
                    className="flex items-center space-x-3 p-2.5 bg-slate-950/60 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-20 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{item.channelTitle}</p>
                    </div>
                    <button
                      onClick={() => {
                        onAddVideo(item.url);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </button>
                  </div>
                ))}

                {searchResults.length === 0 && !isSearching && searchQuery && (
                  <p className="text-center text-xs text-slate-500 py-6">No results found. Try another search query.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Samples */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Click any pre-tested sample to instantly start watching and test sync:
              </p>
              {SAMPLE_VIDEOS.map((sample) => (
                <div
                  key={sample.url}
                  onClick={() => handleAddSample(sample.url)}
                  className="flex items-center space-x-3 p-3 bg-slate-950/70 hover:bg-slate-800 rounded-xl border border-slate-800 cursor-pointer transition-all group"
                >
                  <img
                    src={sample.thumbnail}
                    alt={sample.title}
                    className="w-18 h-12 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors">
                      {sample.title}
                    </h4>
                    <p className="text-[11px] text-slate-400">{sample.channel}</p>
                  </div>
                  <button className="px-3 py-1.5 bg-slate-800 group-hover:bg-rose-600 text-white text-xs rounded-lg transition-colors">
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
