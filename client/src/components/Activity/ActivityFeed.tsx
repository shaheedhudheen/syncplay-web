import { Activity, Clock, FastForward, Film, Pause, Play } from 'lucide-react';
import type { PlayerActivityItem } from '../../types';

interface ActivityFeedProps {
  activities: PlayerActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getActionIcon = (action: PlayerActivityItem['action']) => {
    switch (action) {
      case 'pause':
        return <Pause className="w-3.5 h-3.5 text-amber-400" />;
      case 'play':
        return <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />;
      case 'seek':
        return <FastForward className="w-3.5 h-3.5 text-sky-400" />;
      case 'video_change':
        return <Film className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getActionBadgeColor = (action: PlayerActivityItem['action']) => {
    switch (action) {
      case 'pause':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
      case 'play':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
      case 'seek':
        return 'bg-sky-500/10 border-sky-500/20 text-sky-300';
      case 'video_change':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  // Display newest activity at the top
  const sortedActivities = [...activities].reverse();

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center">
            <Activity className="w-4 h-4 mr-2 text-rose-400" />
            Room Activity
            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-full font-normal">
              {activities.length}
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Real-time log of playback and room events</p>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {sortedActivities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-3 text-slate-400">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-slate-400">No activity recorded yet</p>
            <p className="text-[11px] text-slate-600 mt-1 max-w-[220px]">
              Playback updates like seeking, pausing, and video changes will be logged here instead of crowding your chat.
            </p>
          </div>
        ) : (
          sortedActivities.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/80 rounded-xl transition-all flex items-start space-x-3 group"
            >
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ${getActionBadgeColor(
                  item.action
                )}`}
              >
                {getActionIcon(item.action)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 truncate flex items-center">
                    <span className="mr-1">{item.userAvatar}</span>
                    <span className="text-rose-400 mr-1.5">{item.userName}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words font-medium">
                  {item.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
