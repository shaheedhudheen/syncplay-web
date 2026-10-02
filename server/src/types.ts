export type VideoSource = 'youtube' | 'direct';

export interface VideoItem {
  id: string; // unique item ID in queue
  url: string;
  source: VideoSource;
  videoId?: string; // YouTube video ID (11 chars)
  title: string;
  thumbnail?: string;
  duration?: number; // duration in seconds
  channelTitle?: string;
  addedBy: string;
  addedAt: number;
}

export interface PlaybackState {
  state: 'playing' | 'paused' | 'buffering';
  currentTime: number; // in seconds
  playbackRate: number;
  lastUpdated: number; // server timestamp in ms
  updatedBy: string; // name of user who triggered the action
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomUser {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  joinedAt: number;
}

export interface WatchHistoryItem {
  id: string;
  video: VideoItem;
  watchedAt: number;
  watchedDuration?: number;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  description?: string;
  videos: VideoItem[];
  createdAt: number;
  createdBy: string;
}

export interface PlayerActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: 'play' | 'pause' | 'seek' | 'rate' | 'video_change';
  timeStr?: string;
  text: string;
  timestamp: number;
}

export interface RoomState {
  id: string;
  name: string;
  createdAt: number;
  currentVideo: VideoItem | null;
  playback: PlaybackState;
  queue: VideoItem[];
  chatMessages: ChatMessage[];
  users: Record<string, RoomUser>;
  history: WatchHistoryItem[];
  activityLog?: PlayerActivityItem[];
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
  userAvatar: string;
  timestamp: number;
}
