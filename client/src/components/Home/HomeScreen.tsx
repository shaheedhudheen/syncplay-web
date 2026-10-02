import { ArrowRight, Dices, Heart, LogIn, Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { UserProfile } from '../../types';

interface HomeScreenProps {
  user: UserProfile;
  availableAvatars: string[];
  onUpdateProfile: (name: string, avatar: string) => void;
  onEnterRoom: (roomId: string, customName?: string) => void;
}

const NAME_SUGGESTIONS = [
  'Friday Movie Date',
  'Cozy Cinema Night',
  'Anime & Snacks',
  'Late Night Lounge',
  'Weekend Watch Party',
  'Popcorn & Chill',
  'Lofi & Study Room',
  'Couple YouTube Jam',
];

export function HomeScreen({
  user,
  availableAvatars,
  onUpdateProfile,
  onEnterRoom,
}: HomeScreenProps) {
  const [userName, setUserName] = useState(user.name);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [customRoomName, setCustomRoomName] = useState('');
  const [roomNameError, setRoomNameError] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [lastActiveRoom, setLastActiveRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('syncplay_last_active_room');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setLastActiveRoom(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDismissLastRoom = () => {
    setLastActiveRoom(null);
    try {
      localStorage.removeItem('syncplay_last_active_room');
    } catch {
      // ignore
    }
  };

  const handleNameBlur = () => {
    if (userName.trim() !== user.name) {
      onUpdateProfile(userName.trim() || 'Cozy Viewer', selectedAvatar);
    }
  };

  const handleSelectAvatar = (av: string) => {
    setSelectedAvatar(av);
    onUpdateProfile(userName.trim() || 'Cozy Viewer', av);
  };

  const handleSuggestName = () => {
    const random = NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)];
    setCustomRoomName(random);
    setRoomNameError(null);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customRoomName.trim();
    if (!trimmed) {
      setRoomNameError('Please enter a room name before creating.');
      return;
    }

    setRoomNameError(null);
    const slug = slugify(trimmed) || `room-${Date.now().toString(36)}`;
    onEnterRoom(slug, trimmed);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    let cleanCode = joinCodeInput.trim();
    // If user pasted a full URL like http://.../room/xyz-123
    if (cleanCode.includes('/room/')) {
      cleanCode = cleanCode.split('/room/').pop()?.split('?')[0] || cleanCode;
    }

    onEnterRoom(cleanCode.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-rose-600/15 via-pink-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center">
        {/* App Logo & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Heart className="w-3.5 h-3.5 fill-rose-500" />
            <span>Cozy Watch Party for Couples</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center">
            SyncPlay <span className="text-rose-500 ml-2">Web</span>
          </h1>
          <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            Watch YouTube and videos in perfect synchronization with your partner, comment live in chat, and react in real-time.
          </p>
        </div>

        {/* User Identity Card */}
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-8 backdrop-blur-md shadow-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Your Profile</span>
            <span className="text-[10px] text-slate-500">Auto-saved</span>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <div className="text-3xl p-2 bg-slate-800/80 rounded-2xl border border-slate-700/60 select-none">
              {selectedAvatar}
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 mb-1">Your Nickname</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="Enter your name"
                className="w-full bg-slate-950 text-slate-100 text-sm font-medium px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-2">Choose Avatar</label>
            <div className="flex flex-wrap gap-2">
              {availableAvatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => handleSelectAvatar(av)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                    selectedAvatar === av
                      ? 'bg-rose-600 scale-110 shadow-md shadow-rose-600/30'
                      : 'bg-slate-800/60 hover:bg-slate-800 hover:scale-105'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rejoin Last Active Room Card (If user previously was in a room) */}
        {lastActiveRoom && (
          <div className="w-full max-w-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 border border-rose-500/30 rounded-2xl p-4 mb-8 flex items-center justify-between shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-lg flex-shrink-0">
                🍿
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 flex items-center mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mr-1.5" />
                  You were just in this room
                </div>
                <h4 className="text-sm font-bold text-white truncate">{lastActiveRoom.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">#{lastActiveRoom.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
              <button
                onClick={() => onEnterRoom(lastActiveRoom.id, lastActiveRoom.name)}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl flex items-center transition-all shadow-md shadow-rose-500/25"
              >
                <span>Rejoin Room</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
              <button
                onClick={handleDismissLastRoom}
                className="p-2 text-slate-500 hover:text-slate-300 rounded-xl transition-colors hover:bg-slate-800"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-10">
          {/* Create Room Card */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <form onSubmit={handleCreateRoom} className="flex flex-col h-full justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">Create Watch Room</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Give your watch party a room name to get started. You can also click Suggest to get a cute name.
                </p>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-slate-400">
                      Room Name <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSuggestName}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center transition-colors"
                      title="Generate a random suggested name"
                    >
                      <Dices className="w-3 h-3 mr-1" />
                      Suggest Name
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={customRoomName}
                    onChange={(e) => {
                      setCustomRoomName(e.target.value);
                      if (roomNameError) setRoomNameError(null);
                    }}
                    placeholder="e.g. Friday Movie Date"
                    className={`w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors ${
                      roomNameError
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-800 focus:border-rose-500'
                    }`}
                  />
                  {roomNameError && (
                    <p className="text-[11px] text-rose-400 mt-1.5">{roomNameError}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!customRoomName.trim()}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center group"
              >
                <span>Create Watch Room</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <LogIn className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">Join a Room</h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Have a link or code sent by your partner? Paste it here to jump right into their watch room.
              </p>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="Paste room link or code (e.g. friday-movie-date)"
                  className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center"
                >
                  <span>Join Room</span>
                  <LogIn className="w-4 h-4 ml-2" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 border-t border-slate-900 text-center text-xs text-slate-600">
        SyncPlay Web • Enjoy cozy movies & videos together with zero drift
      </div>
    </div>
  );
}
