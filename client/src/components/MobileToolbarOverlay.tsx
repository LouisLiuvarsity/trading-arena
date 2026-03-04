// ============================================================
// Mobile Toolbar Overlay — Floating overlay for Chat, Rank, Stats, News
// Triggered from top toolbar icons, slides up as a full-screen overlay
// User closes it to return to the trading view
// ============================================================

import { useCallback, useEffect } from 'react';
import { X, MessageCircle, Trophy, BarChart3, Newspaper, History } from 'lucide-react';

interface Props {
  activePanel: string | null;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileToolbarOverlay({ activePanel, onClose, children }: Props) {
  // Close on escape key
  useEffect(() => {
    if (!activePanel) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activePanel, onClose]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (activePanel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activePanel]);

  if (!activePanel) return null;

  const panelTitles: Record<string, { label: string; icon: React.ReactNode }> = {
    chat: { label: 'Chat Room', icon: <MessageCircle className="w-4 h-4" /> },
    trades: { label: 'Trade History', icon: <History className="w-4 h-4" /> },
    leaderboard: { label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    stats: { label: 'Market Stats', icon: <BarChart3 className="w-4 h-4" /> },
    news: { label: 'News Feed', icon: <Newspaper className="w-4 h-4" /> },
  };

  const current = panelTitles[activePanel] || { label: activePanel, icon: null };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0E11]/95 backdrop-blur-sm animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[#0B0E11]">
        <div className="flex items-center gap-2 text-[#D1D4DC]">
          {current.icon}
          <span className="text-sm font-semibold">{current.label}</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-[#848E9C]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Toolbar button row for the top of mobile trading page
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  badgeRed?: boolean;
  active?: boolean;
  onClick: () => void;
}

function ToolbarButton({ icon, label, badge, badgeRed, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
        active
          ? 'bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30'
          : 'bg-white/[0.03] text-[#848E9C] border border-[rgba(255,255,255,0.08)] hover:bg-white/[0.06] hover:text-[#D1D4DC]'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge !== undefined && badge !== 0 && (
        badgeRed ? (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#F6465D] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {Number(badge) > 99 ? '99+' : badge}
          </span>
        ) : (
          <span className="ml-0.5 px-1 py-0 text-[9px] bg-[#F0B90B]/20 text-[#F0B90B] rounded-full font-mono">
            {badge}
          </span>
        )
      )}
    </button>
  );
}

interface MobileToolbarProps {
  activePanel: string | null;
  onSelectPanel: (panel: string) => void;
  tradesCount?: number;
  chatBadge?: number;
}

export function MobileToolbar({ activePanel, onSelectPanel, tradesCount, chatBadge }: MobileToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto no-scrollbar border-b border-[rgba(255,255,255,0.06)] bg-[#0B0E11]">
      <ToolbarButton
        icon={<MessageCircle className="w-3.5 h-3.5" />}
        label="Chat"
        badge={chatBadge}
        badgeRed
        active={activePanel === 'chat'}
        onClick={() => onSelectPanel('chat')}
      />
      <ToolbarButton
        icon={<History className="w-3.5 h-3.5" />}
        label="Trades"
        badge={tradesCount}
        active={activePanel === 'trades'}
        onClick={() => onSelectPanel('trades')}
      />
      <ToolbarButton
        icon={<Trophy className="w-3.5 h-3.5" />}
        label="Rank"
        active={activePanel === 'leaderboard'}
        onClick={() => onSelectPanel('leaderboard')}
      />
      <ToolbarButton
        icon={<BarChart3 className="w-3.5 h-3.5" />}
        label="Stats"
        active={activePanel === 'stats'}
        onClick={() => onSelectPanel('stats')}
      />
      <ToolbarButton
        icon={<Newspaper className="w-3.5 h-3.5" />}
        label="News"
        active={activePanel === 'news'}
        onClick={() => onSelectPanel('news')}
      />
    </div>
  );
}
