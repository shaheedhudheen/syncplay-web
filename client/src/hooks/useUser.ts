import { useEffect, useState } from 'react';
import type { UserProfile } from '../types';

const STORAGE_KEY = 'syncplay_user_profile';

const DEFAULT_AVATARS = ['🐱', '🐻', '🐼', '🦊', '🐰', '🐨', '🐶', '🦄', '🍿', '💖', '🎧', '✨'];

export function useUser() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }

    const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
    const randomId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      userId: randomId,
      name: 'Cozy Viewer',
      avatar: randomAvatar,
    };
  });

  const updateProfile = (name: string, avatar: string) => {
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'Cozy Viewer',
      avatar: avatar || profile.avatar,
    };
    setProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage error
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Storage error
    }
  }, [profile]);

  return {
    profile,
    updateProfile,
    availableAvatars: DEFAULT_AVATARS,
  };
}
