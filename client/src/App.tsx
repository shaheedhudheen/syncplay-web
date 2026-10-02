import { useEffect, useState } from 'react';
import { HomeScreen } from './components/Home/HomeScreen';
import { RoomView } from './components/Room/RoomView';
import { useUser } from './hooks/useUser';

export function App() {
  const { profile, updateProfile, availableAvatars } = useUser();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);

  // Sync state with browser URL & handle back/forward navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/room/')) {
        const id = path.replace('/room/', '').split('/')[0];
        if (id) {
          const cleanId = decodeURIComponent(id).toLowerCase();
          setCurrentRoomId(cleanId);

          // Restore name from localStorage if it matches
          try {
            const saved = localStorage.getItem('syncplay_last_active_room');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.id === cleanId) {
                setCurrentRoomName(parsed.name);
                return;
              }
            }
          } catch {}

          setCurrentRoomName(cleanId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
          return;
        }
      }
      setCurrentRoomId(null);
      setCurrentRoomName(null);
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleEnterRoom = (roomId: string, customName?: string) => {
    const cleanId = roomId.trim().toLowerCase();
    const finalName = customName || cleanId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    setCurrentRoomId(cleanId);
    setCurrentRoomName(finalName);

    try {
      localStorage.setItem(
        'syncplay_last_active_room',
        JSON.stringify({ id: cleanId, name: finalName })
      );
    } catch {}

    window.history.pushState({}, '', `/room/${cleanId}`);
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setCurrentRoomName(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {currentRoomId ? (
        <RoomView
          roomId={currentRoomId}
          roomName={currentRoomName || undefined}
          user={profile}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <HomeScreen
          user={profile}
          availableAvatars={availableAvatars}
          onUpdateProfile={updateProfile}
          onEnterRoom={handleEnterRoom}
        />
      )}
    </div>
  );
}

export default App;
