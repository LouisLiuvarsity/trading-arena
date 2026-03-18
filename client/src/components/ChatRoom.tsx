// ============================================================
// Chat Room — Participant real-time chat with emotional pressure
// Design: Dark chat with color-coded message types
// Message types: user, system, alert, brag, panic, fomo
// Emotional messages are styled to trigger FOMO, panic, envy
// ============================================================

import { useState, useRef, useEffect, useMemo, memo } from 'react';
import type { ChatMessage } from '@/lib/types';
import { useT } from '@/lib/i18n';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  highlightFromIndex?: number;
  readOnly?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const MESSAGE_STYLES: Record<string, { bg: string; nameColor: string; textColor: string; icon?: string }> = {
  user: { bg: '', nameColor: 'text-[#848E9C]', textColor: 'text-[#D1D4DC]' },
  system: { bg: 'bg-[#F0B90B]/[0.06] border-l-2 border-[#F0B90B]/30', nameColor: 'text-[#F0B90B]', textColor: 'text-[#F0B90B]', icon: '📢' },
  alert: { bg: 'bg-[#F6465D]/[0.06] border-l-2 border-[#F6465D]/30', nameColor: 'text-[#F6465D]', textColor: 'text-[#F6465D]', icon: '⚠️' },
  brag: { bg: 'bg-[#0ECB81]/[0.04]', nameColor: 'text-[#0ECB81]', textColor: 'text-[#0ECB81]/90', icon: '💰' },
  panic: { bg: 'bg-[#F6465D]/[0.03]', nameColor: 'text-[#F6465D]/80', textColor: 'text-[#D1D4DC]/80', icon: '😰' },
  fomo: { bg: 'bg-[#F0B90B]/[0.03]', nameColor: 'text-[#F0B90B]/80', textColor: 'text-[#D1D4DC]/90', icon: '🔥' },
};

function ChatRoom({ messages, onSendMessage, highlightFromIndex, readOnly = false }: Props) {
  const { t } = useT();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    if (scrollRef.current && isAutoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAutoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setIsAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
      setIsAutoScroll(true);
    }
  };

  // Stable online count that only changes every 30 seconds
  const [onlineCount, setOnlineCount] = useState(() => 847 + Math.floor(Math.random() * 50));
  useEffect(() => {
    const timer = setInterval(() => setOnlineCount(847 + Math.floor(Math.random() * 50)), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#848E9C] uppercase tracking-wider font-semibold">{t('chat.header')}</span>
          <span className="text-[8px] text-[#848E9C]/50">{t('chat.persist')}</span>
        </div>
        <span className="text-[9px] text-[#0ECB81]">{t('chat.online', { n: onlineCount })}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5"
      >
        {messages.map((msg, idx) => {
          const style = MESSAGE_STYLES[msg.type] || MESSAGE_STYLES.user;
          const isYou = msg.username === 'You';
          const isSystemType = msg.type === 'system' || msg.type === 'alert';

          return (
            <div
              key={msg.id}
              className={`text-[11px] leading-relaxed px-2 py-[3px] rounded-sm ${style.bg} ${
                msg.type === 'brag' ? 'animate-fade-in-up' : ''
              } ${highlightFromIndex !== undefined && idx >= highlightFromIndex ? 'animate-message-highlight' : ''}`}
            >
              <span className="text-[8px] text-[#848E9C]/40 mr-1 font-mono tabular-nums">
                {formatTime(msg.timestamp)}
              </span>

              {isSystemType ? (
                <span className={style.textColor}>
                  {style.icon} {msg.message}
                </span>
              ) : (
                <>
                  {style.icon && !isYou && (
                    <span className="mr-0.5">{style.icon}</span>
                  )}
                  <span className={`font-semibold mr-1 ${isYou ? 'text-[#0ECB81]' : style.nameColor}`}>
                    {msg.username}:
                  </span>
                  <span className={style.textColor}>{msg.message}</span>
                </>
              )}
            </div>
          );
        })}

        {/* Scroll to bottom indicator */}
        {!isAutoScroll && (
          <button
            onClick={() => {
              setIsAutoScroll(true);
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }}
            className="sticky bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#F0B90B]/20 text-[#F0B90B] text-[9px] rounded-full hover:bg-[#F0B90B]/30 transition-colors"
          >
            {t('chat.newMessages')}
          </button>
        )}
      </div>

      {/* Input */}
      {readOnly ? (
        <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.06)] text-[10px] text-[#848E9C]">
          {t('chat.readOnlySpectator')}
        </div>
      ) : (
        <div className="flex items-center gap-1 px-2 py-1.5 border-t border-[rgba(255,255,255,0.06)]">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={t('chat.placeholder')}
            maxLength={280}
            className="flex-1 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-[11px] text-[#D1D4DC] placeholder-[#848E9C]/50 focus:outline-none focus:border-[#F0B90B]/30"
          />
          <button
            onClick={handleSend}
            className="px-2.5 py-1 bg-[#F0B90B]/15 text-[#F0B90B] text-[10px] rounded hover:bg-[#F0B90B]/25 transition-colors font-semibold"
          >
            {t('chat.send')}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(ChatRoom);
