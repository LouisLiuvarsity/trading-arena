// ============================================================
// Competition Notifications — Enhanced push notification system
// Design: Blueprint-defined push schedule + emotional triggers
// Includes: rank changes, trade pace, withdrawal anxiety,
// promotion line proximity, overtaken alerts
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { AccountState, MatchState, SocialData } from '@/lib/types';

interface Props {
  account: AccountState;
  match: MatchState;
  social?: SocialData;
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
      description: `排名 #${a.rank} | 收益 ${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(1)} USDT | 晋级分 ${a.promotionScore} | 参与度 ${a.participationScore}`,
      urgency: 'info',
    }),
  },
  {
    triggerElapsedPct: 0.5,
    id: 'half',
    getMessage: (a) => ({
      title: `📈 半程报告 — 预计可提现 ${a.withdrawable.toFixed(1)} USDT`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore}${a.promotionScore >= 700 ? ' ✓达标' : ` (需≥700, 差${700 - a.promotionScore})`} | 再交易 ${Math.max(0, Math.ceil((40000 - a.participationScore) / 3000))} 笔可升至25%分成`,
      urgency: 'info',
    }),
  },
  {
    triggerElapsedPct: 0.75,
    id: 'last6h',
    getMessage: (a) => ({
      title: `⚡ 最后6小时！`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 累计可提现 ${a.withdrawable.toFixed(1)} USDT | ${a.tradesMax - a.tradesUsed} 笔交易机会剩余`,
      urgency: 'warning',
    }),
  },
  {
    triggerElapsedPct: 0.833,
    id: 'last4h',
    getMessage: (a) => ({
      title: `🔥 最后4小时！倒计时变色中...`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 可提现 ${a.withdrawable.toFixed(1)} USDT | 分成 ${a.profitSharePct}%`,
      urgency: 'warning',
    }),
  },
  {
    triggerElapsedPct: 0.917,
    id: 'last2h',
    getMessage: (a) => ({
      title: `🚨 最终结算倒计时！结果将在 02:00:00 后锁定`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 可提现 ${a.withdrawable.toFixed(1)} USDT`,
      urgency: 'critical',
    }),
  },
  {
    triggerElapsedPct: 0.958,
    id: 'last1h',
    getMessage: (a) => ({
      title: `⏰ 最后1小时！最终冲刺！`,
      description: `排名 #${a.rank} | 晋级分 ${a.promotionScore} | 每5分钟更新排名`,
      urgency: 'critical',
    }),
  },
];

export default function CompetitionNotifications({ account, match, social }: Props) {
  const firedRef = useRef<Set<string>>(new Set());
  const intervalCountRef = useRef(0);
  const emotionalCountRef = useRef(0);

  const getElapsedPct = useCallback(() => {
    const now = Date.now();
    return Math.min(1, (now - match.startTime) / (match.endTime - match.startTime));
  }, [match]);

  // Scheduled notifications (blueprint section 2.8)
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = getElapsedPct();

      NOTIFICATIONS.forEach(notif => {
        if (elapsed >= notif.triggerElapsedPct && !firedRef.current.has(notif.id)) {
          firedRef.current.add(notif.id);
          const remainingHours = (1 - elapsed) * 24;
          const { title, description, urgency } = notif.getMessage(account, remainingHours);
          const borderColor = urgency === 'critical' ? '#F6465D' : urgency === 'warning' ? '#F0B90B' : '#0ECB81';

          toast(title, {
            description,
            duration: urgency === 'critical' ? 12000 : 7000,
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

  // Periodic rank notifications (blueprint: near promotion line = frequency x2)
  useEffect(() => {
    const isNearPromotionLine = Math.abs(account.rank - 300) <= 30;
    const elapsed = getElapsedPct();
    if (elapsed < 0.66) return;

    const baseInterval = elapsed > 0.958 ? 60000 : elapsed > 0.917 ? 120000 : elapsed > 0.833 ? 180000 : 300000;
    const interval = isNearPromotionLine ? baseInterval / 2 : baseInterval;

    const timer = setInterval(() => {
      intervalCountRef.current++;
      if (intervalCountRef.current > 12) return;

      const messages = isNearPromotionLine
        ? [
            `⚡ 你在晋级线附近！当前 #${account.rank}`,
            `🏃 晋级线 #300 竞争激烈！你 #${account.rank}`,
            `📊 晋级分 ${account.promotionScore} | 距晋级线 ${account.rank <= 300 ? '已达标 ✓' : `差 ${account.rank - 300} 名`}`,
            `🔥 #290-#310 有 ${social?.nearPromotionCount ?? 47} 人在争夺晋级名额！`,
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
  }, [account, social, getElapsedPct]);

  // Emotional pressure notifications (new: overtaken, trade pace, withdrawal anxiety)
  useEffect(() => {
    const emotionalInterval = setInterval(() => {
      emotionalCountRef.current++;
      if (emotionalCountRef.current > 15) return;

      const elapsed = getElapsedPct();
      const messages: Array<{ msg: string; border: string }> = [];

      // "被超越" notification
      if (social && social.tradersOvertakenYou > 0) {
        messages.push({
          msg: `📉 过去30分钟有 ${social.tradersOvertakenYou} 人超越了你！排名 #${account.rank}`,
          border: '#F6465D',
        });
      }

      // Trade pace comparison
      if (social && social.avgTradesPerPerson > account.tradesUsed + 2) {
        messages.push({
          msg: `📊 全场平均已交易 ${social.avgTradesPerPerson.toFixed(0)} 笔，你才 ${account.tradesUsed} 笔`,
          border: '#F0B90B',
        });
      }

      // Participation score gap
      if (account.participationScore < 25000) {
        const gap = 40000 - account.participationScore;
        messages.push({
          msg: `🎯 距25%分成还需 ${gap.toLocaleString()} 积分 | 当前分成 ${account.profitSharePct}%`,
          border: '#F0B90B',
        });
      }

      // Withdrawal anxiety (especially in later stages)
      if (elapsed > 0.7 && account.withdrawable > 50) {
        messages.push({
          msg: `💰 当前可提现 ${account.withdrawable.toFixed(1)} USDT — 保住利润还是冲击更高排名？`,
          border: '#F0B90B',
        });
      }

      // Losing majority reminder
      if (social && social.losingPct > 55) {
        messages.push({
          msg: `📊 全场 ${social.losingPct}% 选手亏损中 | 平均亏损 ${social.avgLossPct}%`,
          border: '#F6465D',
        });
      }

      // Trades remaining warning
      if (account.tradesMax - account.tradesUsed <= 10 && account.tradesMax - account.tradesUsed > 0) {
        messages.push({
          msg: `⚠️ 仅剩 ${account.tradesMax - account.tradesUsed} 笔交易机会！每一笔都很关键`,
          border: '#F6465D',
        });
      }

      // Pick one random message to show
      if (messages.length > 0) {
        const pick = messages[Math.floor(Math.random() * messages.length)];
        toast(pick.msg, {
          duration: 5000,
          style: {
            background: '#1C2030',
            border: `1px solid ${pick.border}`,
            color: '#D1D4DC',
            fontSize: '11px',
          },
        });
      }
    }, 20000 + Math.random() * 15000); // Every 20-35 seconds

    return () => clearInterval(emotionalInterval);
  }, [account, social, getElapsedPct]);

  return null;
}
