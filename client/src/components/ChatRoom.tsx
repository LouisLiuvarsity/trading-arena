// ============================================================
// Chat Room — Participant real-time chat
// Design: Dark chat with system alerts highlighted
// Compact for bottom panel usage
// ============================================================

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ChatRoom({ messages, onSendMessage }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[rgba(255,255,255,0.04)]">
        <span className="text-[10px] text-[#848E9C] uppercase tracking-wider font-semibold">Chat Room</span>
        <span className="text-[9px] text-[#0ECB81]">● 1,000 online</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {messages.map(msg => (
          <div key={msg.id} className={`text-[11px] leading-relaxed px-1.5 py-0.5 rounded ${
            msg.type === 'system' ? 'bg-[#F0B90B]/5' :
            msg.type === 'alert' ? 'bg-[#F6465D]/5' : ''
          }`}>
            <span className="text-[9px] text-[#848E9C]/60 mr-1 font-mono">{formatTime(msg.timestamp)}</span>
            {msg.type === 'user' && (
              <>
                <span className={`font-semibold mr-1 ${msg.username === 'You' ? 'text-[#0ECB81]' : 'text-[#F0B90B]/80'}`}>
                  {msg.username}:
                </span>
                <span className="text-[#D1D4DC]">{msg.message}</span>
              </>
            )}
            {msg.type === 'system' && (
              <span className="text-[#F0B90B]">📢 {msg.message}</span>
            )}
            {msg.type === 'alert' && (
              <span className="text-[#F6465D]">⚠ {msg.message}</span>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-[rgba(255,255,255,0.06)]">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Send message..."
          className="flex-1 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-[11px] text-[#D1D4DC] placeholder-[#848E9C]/50 focus:outline-none focus:border-[#F0B90B]/30"
        />
        <button
          onClick={handleSend}
          className="px-2.5 py-1 bg-[#F0B90B]/15 text-[#F0B90B] text-[10px] rounded hover:bg-[#F0B90B]/25 transition-colors font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}
