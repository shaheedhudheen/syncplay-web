import { Send, Smile } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage, UserProfile } from '../../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentUser: UserProfile;
  typingPartners: string[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onTypingStatus: (isTyping: boolean) => void;
}

const QUICK_REACTIONS = ['❤️', '😂', '🥺', '🍿', '🔥', '👏', '🐱'];

export function ChatBox({
  messages,
  currentUser,
  typingPartners,
  onSendMessage,
  onSendReaction,
  onTypingStatus,
}: ChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Filter out any playback updates (seeks, pauses) so live chat is strictly for conversation!
  const chatMessages = messages.filter(
    (msg) =>
      !(
        msg.isSystem &&
        (msg.text.includes('jumped to') ||
          msg.text.includes('paused at') ||
          msg.text.includes('resumed playback'))
      )
  );

  // Auto-scroll the chat container internally without affecting window/page scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Only scroll if already near bottom (within 180px) or on initial load
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180;
    if (isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText('');
    onTypingStatus(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    onTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStatus(false);
    }, 2000);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Messages Scroll Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-xs">No chat messages yet.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Send a message to your partner!</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex items-center justify-center my-2">
                <span className="text-[11px] bg-slate-800/80 text-slate-400 px-3 py-1 rounded-full border border-slate-700/60 flex items-center">
                  <span className="mr-1.5">{msg.userAvatar || '✨'}</span>
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMe = msg.userId === currentUser.userId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              <div className="flex items-center space-x-1.5 mb-1 px-1">
                <span className="text-xs">{msg.userAvatar}</span>
                <span className="text-xs font-semibold text-slate-400">{msg.userName}</span>
                <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
              </div>
              <div
                className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                  isMe
                    ? 'bg-rose-600 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                }`}
              >
                {msg.text}
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Typing indicator */}
      {typingPartners.length > 0 && (
        <div className="px-4 py-1 text-xs text-rose-400 italic flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-2 animate-ping" />
          {typingPartners.join(', ')} {typingPartners.length > 1 ? 'are' : 'is'} typing...
        </div>
      )}

      {/* Quick Reactions Bar */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 flex items-center">
          <Smile className="w-3.5 h-3.5 mr-1 text-slate-400" /> React:
        </span>
        <div className="flex space-x-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendReaction(emoji)}
              className="text-lg hover:scale-135 active:scale-75 transform transition-all p-1 hover:bg-slate-800 rounded-xl cursor-pointer select-none"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type a message to your partner..."
          className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 text-sm px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
