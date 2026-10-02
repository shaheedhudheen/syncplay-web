import type { FloatingReaction } from '../../types';

interface FloatingReactionsOverlayProps {
  reactions: FloatingReaction[];
}

export function FloatingReactionsOverlay({ reactions }: FloatingReactionsOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((reaction, index) => {
        // Calculate a random horizontal offset to scatter reactions naturally
        const randomLeft = 20 + ((index * 29 + reaction.timestamp) % 65);

        return (
          <div
            key={reaction.id}
            className="absolute bottom-12 animate-float-up flex flex-col items-center select-none"
            style={{ left: `${randomLeft}%` }}
          >
            <span className="text-4xl filter drop-shadow-lg">{reaction.emoji}</span>
            <span className="text-[10px] font-medium bg-slate-900/80 text-rose-300 px-1.5 py-0.5 rounded-full mt-1 border border-rose-500/30">
              {reaction.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
