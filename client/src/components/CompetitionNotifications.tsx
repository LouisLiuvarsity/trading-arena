// ============================================================
// Competition Notifications — Push notification system
// Design: Blueprint-defined push schedule (T+6h, T+12h, etc.)
// Simulates time-based competition alerts via toast
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { AccountState, MatchState } from '@/lib/types';

interface Props {
  account: AccountState;
  match: MatchState;
}

// Notification schedule based on blueprint section 2.8
interface ScheduledNotification {
  triggerElapsedPct: number; // 0-1
  id: string;
  getMessage: (account: AccountState, remainingHours: number) => { title: string; description: string; urgency: 'info' | 'warning' | 'critical' };
}

const NOTIFICATIONS: ScheduledNotification[] = [
  {
    triggerElapsedPct: 0.25, // T+6h
    id: 'quarter',
    getMessage: (a) => ({
      title: `📊 比赛已过1/4！`,
      description: `排名 #${a.rank} | 收益 ${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(1)} USDT | 晋级分 ${a.promotionScore} | 参与度 ${a.participationScore}`,
      urgency: 'info',
    }),
  },
  {
    triggerElapsedPct: 0.5, // T+12h
    id: 'half',
    getMessage: (a) => ({
      title: `📈 半程报告`,
      description: `排名 #${a.rank} | 预计可提现 ${a.withdrawable.toFixed(1)} USDT | 晋级分 ${a.promotionScore}${a.promotionScore >= 700 ? ' ✓' : ` (需≥700)`} | 参与度 ${a.participationScore}/4000`,
      urgency: 'info',
    }),
  },
  {
    triggerElapsedPct: 0.75, // T+18h
    id: 'last6h',
    getMessage: (a) => ({
      title: `⚡ 最后6小时！`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 累计可提现 ${a.withdrawable.toFixed(1)} USDT`,
      urgency: 'warning',
    }),
  },
  {
    triggerElapsedPct: 0.833, // T+20h
    id: 'last4h',
    getMessage: (a) => ({
      title: `🔥 最后4小时！`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 倒计时加速中...`,
      urgency: 'warning',
    }),
  },
  {
    triggerElapsedPct: 0.917, // T+22h
    id: 'last2h',
    getMessage: (a) => ({
      title: `🚨 最终结算倒计时！`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 结果将在 02:00:00 后锁定`,
      urgency: 'critical',
    }),
  },
  {
    triggerElapsedPct: 0.958, // T+23h
    id: 'last1h',
    getMessage: (a) => ({
      title: `⏰ 最后1小时！最终冲刺！`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 把握最后机会！`,
      urgency: 'critical',
    }),
  },
];

export default function CompetitionNotifications({ account, match }: Props) {
  const firedRef = useRef<Set<string>>(new Set());
  const intervalNotifRef = useRef<number>(0);

  const getElapsedPct = useCallback(() => {
    const now = Date.now();
    return Math.min(1, (now - match.startTime) / (match.endTime - match.startTime));
  }, [match]);

  // Check scheduled notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = getElapsedPct();

      NOTIFICATIONS.forEach(notif => {
        if (elapsed >= notif.triggerElapsedPct && !firedRef.current.has(notif.id)) {
          firedRef.current.add(notif.id);
          const remainingHours = ((1 - elapsed) * 24);
          const { title, description, urgency } = notif.getMessage(account, remainingHours);

          const borderColor = urgency === 'critical' ? '#F6465D' : urgency === 'warning' ? '#F0B90B' : '#0ECB81';

          toast(title, {
            description,
            duration: urgency === 'critical' ? 10000 : 6000,
            style: {
              background: '#1C2030',
              border: `1px solid ${borderColor}`,
              color: '#D1D4DC',
              boxShadow: urgency === 'critical' ? `0 0 20px ${borderColor}40` : undefined,
            },
          });
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [account, match, getElapsedPct]);

  // Periodic rank notifications for near-promotion-line users (blueprint: frequency x2)
  useEffect(() => {
    const isNearPromotionLine = Math.abs(account.rank - 300) <= 30;
    const elapsed = getElapsedPct();

    // Only start periodic notifications after 66% elapsed
    if (elapsed < 0.66) return;

    const baseInterval = elapsed > 0.958 ? 60000 : elapsed > 0.917 ? 120000 : elapsed > 0.833 ? 180000 : 300000;
    const interval = isNearPromotionLine ? baseInterval / 2 : baseInterval;

    const timer = setInterval(() => {
      intervalNotifRef.current++;
      // Don't spam too much in demo
      if (intervalNotifRef.current > 10) return;

      const messages = isNearPromotionLine
        ? [
            `⚡ 你在晋级线附近！当前 #${account.rank}`,
            `🏃 晋级线 #300 竞争激烈！你 #${account.rank}`,
            `📊 晋级分 ${account.promotionScore} | 距晋级线 ${account.rank <= 300 ? '已达标' : `差 ${account.rank - 300} 名`}`,
          ]
        : [
            `📊 当前排名 #${account.rank} | 晋级分 ${account.promotionScore}`,
            `💰 可提现 ${account.withdrawable.toFixed(1)} USDT | 排名 #${account.rank}`,
          ];

      const msg = messages[Math.floor(Math.random() * messages.length)];

      toast(msg, {
        duration: 4000,
        style: {
          background: '#1C2030',
          border: `1px solid ${isNearPromotionLine ? '#F0B90B' : 'rgba(255,255,255,0.1)'}`,
          color: '#D1D4DC',
          fontSize: '12px',
        },
      });
    }, interval);

    return () => clearInterval(timer);
  }, [account, getElapsedPct]);

  return null; // This component only produces side effects (toasts)
}
