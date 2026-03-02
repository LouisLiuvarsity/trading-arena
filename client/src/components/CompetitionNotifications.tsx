// ============================================================
// Competition Notifications — Draggable & closeable floating panel
// Design: Floating notification panel that can be moved and dismissed
// Includes: rank changes, trade pace, withdrawal anxiety,
// promotion line proximity, overtaken alerts
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, GripHorizontal, Bell, BellOff } from 'lucide-react';
import type { AccountState, MatchState, SocialData } from '@/lib/types';

interface Props {
  account: AccountState;
  match: MatchState;
  social?: SocialData;
}

interface NotificationItem {
  id: string;
  message: string;
  borderColor: string;
  timestamp: number;
}

interface ScheduledNotification {
  triggerElapsedPct: number;
  id: string;
  getMessage: (account: AccountState, remainingHours: number) => { title: string; description: string; urgency: 'info' | 'warning' | 'critical' };
}

const NOTIFICATIONS: ScheduledNotification[] = [
  {
    triggerElapsedPct: 0.25,
    id: 'quarter',
    getMessage: (a) => ({
      title: `📊 比赛已过 1/4！`,
      description: `排名 #${a.rank} | 收益 ${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(1)} USDT | 积分 +${a.matchPoints} | 参与分 ${a.participationScore.toLocaleString()}`,
      urgency: 'info',
    }),
  },
  {
    triggerElapsedPct: 0.5,
    id: 'half',
    getMessage: (a) => ({
      title: `📈 半程报告 — 预计奖金 ${a.prizeAmount}U`,
      description: `排名 #${a.rank} | 积分 +${a.matchPoints} | 参与分 ${a.participationScore.toLocaleString()} (${a.participationTier}) | ${a.prizeEligible ? '✓有奖金资格' : '✗需Silver+才有奖金资格'}`,
      urgency: 'info',
    }),
  },
  {
    triggerElapsedPct: 0.75,
    id: 'last6h',
    getMessage: (a) => ({
      title: `⚡ 最后6小时！`,
      description: `排名 #${a.rank} | 预计奖金 ${a.prizeAmount}U | 积分 +${a.matchPoints} | ${a.tradesMax - a.tradesUsed} 笔交易机会剩余`,
      urgency: 'warning',
    }),
  },
  {
    triggerElapsedPct: 0.833,
    id: 'last4h',
    getMessage: (a) => ({
      title: `🔥 最后4小时！倒计时变色中...`,
      description: `排名 #${a.rank} | 参与分 ${a.participationScore.toLocaleString()} | 预计奖金 ${a.prizeAmount}U | 积分 +${a.matchPoints}`,
      urgency: 'warning',
    }),
  },
  {
    triggerElapsedPct: 0.917,
    id: 'last2h',
    getMessage: (a) => ({
      title: `🚨 最终结算倒计时！结果将在 02:00:00 后锁定`,
      description: `排名 #${a.rank} | 预计奖金 ${a.prizeAmount}U | 积分 +${a.matchPoints}`,
      urgency: 'critical',
    }),
  },
  {
    triggerElapsedPct: 0.958,
    id: 'last1h',
    getMessage: (a) => ({
      title: `⏰ 最后1小时！最终冲刺！`,
      description: `排名 #${a.rank} | 积分 +${a.matchPoints} | 每5分钟更新排名`,
      urgency: 'critical',
    }),
  },
];

export default function CompetitionNotifications({ account, match, social }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 48 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const emotionalCountRef = useRef(0);
  const maxNotifications = 4;

  const addNotification = useCallback((message: string, borderColor: string) => {
    if (isMuted) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setNotifications(prev => {
      const next = [{ id, message, borderColor, timestamp: Date.now() }, ...prev];
      return next.slice(0, maxNotifications);
    });
    // Auto-show panel when new notification arrives
    setIsVisible(true);
  }, [isMuted]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getElapsedPct = useCallback(() => {
    const now = Date.now();
    return Math.min(1, (now - match.startTime) / (match.endTime - match.startTime));
  }, [match]);

  // Scheduled notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = getElapsedPct();
      NOTIFICATIONS.forEach(notif => {
        if (elapsed >= notif.triggerElapsedPct && !firedRef.current.has(notif.id)) {
          firedRef.current.add(notif.id);
          const remainingHours = (1 - elapsed) * 24;
          const { title, description, urgency } = notif.getMessage(account, remainingHours);
          const borderColor = urgency === 'critical' ? '#F6465D' : urgency === 'warning' ? '#F0B90B' : '#0ECB81';
          addNotification(`${title}\n${description}`, borderColor);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [account, match, getElapsedPct, addNotification]);

  // Emotional pressure notifications
  useEffect(() => {
    const emotionalInterval = setInterval(() => {
      emotionalCountRef.current++;
      if (emotionalCountRef.current > 15) return;

      const elapsed = getElapsedPct();
      const messages: Array<{ msg: string; border: string }> = [];

      if (social && social.tradersOvertakenYou > 0) {
        messages.push({
          msg: `📉 过去30分钟有 ${social.tradersOvertakenYou} 人超越了你！排名 #${account.rank}`,
          border: '#F6465D',
        });
      }
      if (social && social.avgTradesPerPerson > account.tradesUsed + 2) {
        messages.push({
          msg: `📊 全场平均已交易 ${social.avgTradesPerPerson.toFixed(0)} 笔，你才 ${account.tradesUsed} 笔`,
          border: '#F0B90B',
        });
      }
      if (account.participationScore < 25000) {
        const gap = 40000 - account.participationScore;
        messages.push({
          msg: `🎯 参与分 ${account.participationScore.toLocaleString()} | 当前等级: ${account.participationTier} | 需5000+才有奖金资格`,
          border: '#F0B90B',
        });
      }
      if (elapsed > 0.7 && account.prizeAmount > 0) {
        messages.push({
          msg: `💰 当前预计奖金 ${account.prizeAmount} USDT — 保住排名还是冲击更高？`,
          border: '#F0B90B',
        });
      }
      if (social && social.losingPct > 55) {
        messages.push({
          msg: `📊 全场 ${social.losingPct}% 选手亏损中 | 平均亏损 ${social.avgLossPct}%`,
          border: '#F6465D',
        });
      }
      if (account.tradesMax - account.tradesUsed <= 10 && account.tradesMax - account.tradesUsed > 0) {
        messages.push({
          msg: `⚠️ 仅剩 ${account.tradesMax - account.tradesUsed} 笔交易机会！每一笔都很关键`,
          border: '#F6465D',
        });
      }

      if (messages.length > 0) {
        const pick = messages[Math.floor(Math.random() * messages.length)];
        addNotification(pick.msg, pick.border);
      }
    }, 20000 + Math.random() * 15000);

    return () => clearInterval(emotionalInterval);
  }, [account, social, getElapsedPct, addNotification]);

  // Auto-remove old notifications after 15 seconds
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => prev.filter(n => now - n.timestamp < 15000));
    }, 3000);
    return () => clearInterval(cleanup);
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Minimized bell icon when panel is hidden
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed z-[9999] w-8 h-8 rounded-full bg-[#1C2030] border border-[rgba(255,255,255,0.15)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer"
        style={{ left: position.x, top: position.y }}
        title="显示通知"
      >
        <Bell className="w-3.5 h-3.5 text-[#F0B90B]" />
        {notifications.length > 0 && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#F6465D] rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">{notifications.length}</span>
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] w-[300px] max-h-[280px] flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
    >
      {/* Panel header — draggable */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-2.5 py-1.5 bg-[#1C2030] border border-[rgba(255,255,255,0.12)] rounded-t-lg cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="w-3.5 h-3.5 text-[#5E6673]" />
          <Bell className="w-3 h-3 text-[#F0B90B]" />
          <span className="text-[10px] text-[#848E9C] font-medium">通知</span>
          {notifications.length > 0 && (
            <span className="text-[9px] bg-[#F0B90B]/20 text-[#F0B90B] px-1.5 py-0.5 rounded-full font-bold">{notifications.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            title={isMuted ? '取消静音' : '静音通知'}
          >
            {isMuted ? (
              <BellOff className="w-3 h-3 text-[#F6465D]" />
            ) : (
              <Bell className="w-3 h-3 text-[#848E9C]" />
            )}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            title="关闭通知面板"
          >
            <X className="w-3 h-3 text-[#848E9C] hover:text-white" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto bg-[#0B0E11]/95 border-x border-b border-[rgba(255,255,255,0.08)] rounded-b-lg backdrop-blur-sm">
        {notifications.length === 0 ? (
          <div className="py-4 text-center text-[#5E6673] text-[10px]">
            {isMuted ? '通知已静音' : '暂无新通知'}
          </div>
        ) : (
          <div className="p-1.5 space-y-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="relative group rounded-md px-2.5 py-2 text-[11px] text-[#D1D4DC] leading-relaxed animate-in slide-in-from-top-2 duration-300"
                style={{
                  background: '#1C2030',
                  borderLeft: `3px solid ${notif.borderColor}`,
                }}
              >
                <button
                  onClick={() => removeNotification(notif.id)}
                  className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[rgba(255,255,255,0.1)] transition-all"
                >
                  <X className="w-2.5 h-2.5 text-[#5E6673]" />
                </button>
                {notif.message.split('\n').map((line, i) => (
                  <div key={i} className={i === 0 ? 'font-medium text-white text-[11px]' : 'text-[10px] text-[#848E9C] mt-0.5'}>
                    {line}
                  </div>
                ))}
                <div className="text-[8px] text-[#5E6673] mt-1">
                  {new Date(notif.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
