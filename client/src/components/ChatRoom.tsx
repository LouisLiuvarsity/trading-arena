// ============================================================
// Chat Room — Participant real-time chat
// Design: Dark chat with system alerts highlighted
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <div className="panel-header flex items-center justify-between">
        <span>Chat Room</span>
        <span className="text-[10px] text-[#0ECB81]">● {1000} online</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {messages.map(msg => (
          <div key={msg.id} className={`text-[11px] leading-relaxed ${
            msg.type === 'system' ? 'bg-[#F0B90B]/5 rounded px-2 py-1' :
            msg.type === 'alert' ? 'bg-[#F6465D]/5 rounded px-2 py-1' : ''
          }`}>
            <span className="text-[9px] text-[#848E9C] mr-1">{formatTime(msg.timestamp)}</span>
            {msg.type === 'user' && (
              <>
                <span className="text-[#F0B90B] font-semibold mr-1">{msg.username}:</span>
                <span className="text-[#D1D4DC]">{msg.message}</span>
              </>
            )}
            {msg.type === 'system' && (
              <span className="text-[#F0B90B]">{msg.message}</span>
            )}
            {msg.type === 'alert' && (
              <span className="text-[#F6465D]">{msg.message}</span>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1 p-2 border-t border-[rgba(255,255,255,0.06)]">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Send message..."
          className="flex-1 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1.5 text-[11px] text-[#D1D4DC] placeholder-[#848E9C]/50 focus:outline-none focus:border-[#F0B90B]/30"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1.5 bg-[#F0B90B]/15 text-[#F0B90B] text-[11px] rounded hover:bg-[#F0B90B]/25 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
