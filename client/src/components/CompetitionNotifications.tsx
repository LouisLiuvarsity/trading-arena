// ============================================================
// Competition Notifications — Draggable & closeable floating panel
// Design: Floating notification panel that can be moved and dismissed
// Includes: rank changes, trade pace, withdrawal anxiety,
// promotion line proximity, overtaken alerts
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, GripHorizontal, Bell, BellOff } from 'lucide-react';
import type { AccountState, MatchState, PredictionState, SocialData } from '@/lib/types';
import { useT } from '@/lib/i18n';

interface Props {
  account: AccountState;
  match: MatchState;
  social?: SocialData;
  prediction?: PredictionState | null;
  onSubmitPrediction?: (direction: "up" | "down", confidence: number) => Promise<void>;
}

interface NotificationItem {
  id: string;
  message: string;
  borderColor: string;
  timestamp: number;
  type?: "standard" | "prediction";
}

interface ScheduledNotification {
  triggerElapsedPct: number;
  id: string;
  getKey: () => { titleKey: string; descKey: string; urgency: 'info' | 'warning' | 'critical' };
}

const NOTIFICATIONS: ScheduledNotification[] = [
  { triggerElapsedPct: 0.25, id: 'quarter', getKey: () => ({ titleKey: 'notif.quarter', descKey: 'notif.quarterDesc', urgency: 'info' }) },
  { triggerElapsedPct: 0.5, id: 'half', getKey: () => ({ titleKey: 'notif.half', descKey: 'notif.halfDesc', urgency: 'info' }) },
  { triggerElapsedPct: 0.75, id: 'last6h', getKey: () => ({ titleKey: 'notif.last6h', descKey: 'notif.last6hDesc', urgency: 'warning' }) },
  { triggerElapsedPct: 0.833, id: 'last4h', getKey: () => ({ titleKey: 'notif.last4h', descKey: 'notif.last4hDesc', urgency: 'warning' }) },
  { triggerElapsedPct: 0.917, id: 'last2h', getKey: () => ({ titleKey: 'notif.last2h', descKey: 'notif.last2hDesc', urgency: 'critical' }) },
  { triggerElapsedPct: 0.958, id: 'last1h', getKey: () => ({ titleKey: 'notif.last1h', descKey: 'notif.last1hDesc', urgency: 'critical' }) },
];

export default function CompetitionNotifications({ account, match, social, prediction, onSubmitPrediction }: Props) {
  const { t } = useT();
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
    setIsVisible(true);
  }, [isMuted]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getElapsedPct = useCallback(() => {
    const now = Date.now();
    return Math.min(1, (now - match.startTime) / (match.endTime - match.startTime));
  }, [match]);

  // Build notification vars from account
  const buildVars = useCallback((a: AccountState) => ({
    rank: a.rank,
    pnl: `${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(1)}`,
    pts: a.matchPoints,
    used: a.tradesUsed,
    max: a.tradesMax,
    prize: a.prizeAmount,
    left: a.tradesMax - a.tradesUsed,
    eligible: a.prizeEligible ? t('notif.halfEligible') : t('notif.halfNotEligible', { n: a.tradesUsed }),
  }), [t]);

  // Scheduled notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = getElapsedPct();
      const vars = buildVars(account);
      NOTIFICATIONS.forEach(notif => {
        if (elapsed >= notif.triggerElapsedPct && !firedRef.current.has(notif.id)) {
          firedRef.current.add(notif.id);
          const { titleKey, descKey, urgency } = notif.getKey();
          const title = t(titleKey, vars);
          const description = t(descKey, vars);
          const borderColor = urgency === 'critical' ? '#F6465D' : urgency === 'warning' ? '#F0B90B' : '#0ECB81';
          addNotification(`${title}\n${description}`, borderColor);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [account, match, getElapsedPct, addNotification, t, buildVars]);

  // Emotional pressure notifications
  useEffect(() => {
    const emotionalInterval = setInterval(() => {
      emotionalCountRef.current++;
      if (emotionalCountRef.current > 15) return;

      const elapsed = getElapsedPct();
      const messages: Array<{ msg: string; border: string }> = [];

      if (social && social.tradersOvertakenYou > 0) {
        messages.push({
          msg: t('notif.overtaken', { n: social.tradersOvertakenYou, rank: account.rank }),
          border: '#F6465D',
        });
      }
      if (social && social.avgTradesPerPerson > account.tradesUsed + 2) {
        messages.push({
          msg: t('notif.tradePace', { avg: social.avgTradesPerPerson.toFixed(0), yours: account.tradesUsed }),
          border: '#F0B90B',
        });
      }
      if (!account.prizeEligible) {
        messages.push({
          msg: t('notif.eligibility', { n: 5 - account.tradesUsed, used: account.tradesUsed }),
          border: '#F0B90B',
        });
      }
      if (elapsed > 0.7 && account.prizeAmount > 0) {
        messages.push({
          msg: t('notif.currentPrize', { prize: account.prizeAmount }),
          border: '#F0B90B',
        });
      }
      if (social && social.losingPct > 55) {
        messages.push({
          msg: t('notif.fieldLosing', { pct: social.losingPct, avgLoss: social.avgLossPct }),
          border: '#F6465D',
        });
      }
      if (account.tradesMax - account.tradesUsed <= 10 && account.tradesMax - account.tradesUsed > 0) {
        messages.push({
          msg: t('notif.tradesRemaining', { n: account.tradesMax - account.tradesUsed }),
          border: '#F6465D',
        });
      }

      if (messages.length > 0) {
        const pick = messages[Math.floor(Math.random() * messages.length)];
        addNotification(pick.msg, pick.border);
      }
    }, 20000 + Math.random() * 15000);

    return () => clearInterval(emotionalInterval);
  }, [account, social, getElapsedPct, addNotification, t]);

  // Prediction window notifications — trigger on the hour, stay 5 minutes
  const predictionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removalTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const makePredMessage = () => {
      const stats = prediction?.stats;
      const accuracyText = stats
        ? t('notif.predAccuracy', { pct: stats.accuracy, correct: stats.correctPredictions, total: stats.totalPredictions })
        : '';
      return `${t('notif.prediction')}\n${accuracyText}`;
    };

    const scheduleNextHour = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const msUntilNextHour = nextHour.getTime() - now.getTime();

      predictionTimerRef.current = setTimeout(() => {
        if (!isMuted) {
          const hourKey = `pred-hourly-${nextHour.getHours()}`;
          const id = hourKey;
          setNotifications(prev => {
            if (prev.some(n => n.id === id)) return prev;
            const next = [{
              id,
              message: makePredMessage(),
              borderColor: '#F0B90B',
              timestamp: Date.now(),
              type: "prediction" as const,
            }, ...prev];
            return next.slice(0, maxNotifications);
          });
          setIsVisible(true);
          removalTimersRef.current.push(setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
          }, 5 * 60 * 1000));
        }
        scheduleNextHour();
      }, msUntilNextHour);
    };

    const now = new Date();
    if (now.getMinutes() < 5) {
      const hourKey = `pred-hourly-${now.getHours()}`;
      if (!firedRef.current.has(hourKey) && !isMuted) {
        firedRef.current.add(hourKey);
        const id = hourKey;
        setNotifications(prev => {
          if (prev.some(n => n.id === id)) return prev;
          const next = [{
            id,
            message: makePredMessage(),
            borderColor: '#F0B90B',
            timestamp: Date.now(),
            type: "prediction" as const,
          }, ...prev];
          return next.slice(0, maxNotifications);
        });
        setIsVisible(true);
        const remainMs = (5 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
        removalTimersRef.current.push(setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, remainMs));
      }
    }

    scheduleNextHour();
    return () => {
      if (predictionTimerRef.current) clearTimeout(predictionTimerRef.current);
      removalTimersRef.current.forEach(clearTimeout);
      removalTimersRef.current = [];
    };
  }, [prediction, isMuted, t]);

  // Auto-remove old notifications after 15 seconds (except prediction type which has its own 5-min timer)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => prev.filter(n => n.type === 'prediction' || now - n.timestamp < 15000));
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
        title={t('notif.showNotif')}
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
          <span className="text-[10px] text-[#848E9C] font-medium">{t('notif.title')}</span>
          {notifications.length > 0 && (
            <span className="text-[9px] bg-[#F0B90B]/20 text-[#F0B90B] px-1.5 py-0.5 rounded-full font-bold">{notifications.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            title={isMuted ? t('notif.unmute') : t('notif.mute')}
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
            title={t('notif.closePanel')}
          >
            <X className="w-3 h-3 text-[#848E9C] hover:text-white" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto bg-[#0B0E11]/95 border-x border-b border-[rgba(255,255,255,0.08)] rounded-b-lg backdrop-blur-sm">
        {notifications.length === 0 ? (
          <div className="py-4 text-center text-[#5E6673] text-[10px]">
            {isMuted ? t('notif.muted') : t('notif.empty')}
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
                {notif.type === 'prediction' && prediction && !prediction.alreadySubmitted && prediction.isWindowOpen && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onSubmitPrediction?.("up", 3)}
                      className="flex-1 py-1.5 bg-[#0ECB81]/20 text-[#0ECB81] text-[10px] font-bold rounded hover:bg-[#0ECB81]/30 transition-colors"
                    >
                      {t('notif.up')}
                    </button>
                    <button
                      onClick={() => onSubmitPrediction?.("down", 3)}
                      className="flex-1 py-1.5 bg-[#F6465D]/20 text-[#F6465D] text-[10px] font-bold rounded hover:bg-[#F6465D]/30 transition-colors"
                    >
                      {t('notif.down')}
                    </button>
                    <span className="text-[9px] text-[#848E9C] tabular-nums font-mono shrink-0">
                      {prediction.windowClosesIn}s
                    </span>
                  </div>
                )}
                {notif.type === 'prediction' && prediction?.alreadySubmitted && (
                  <div className="mt-1.5 text-[10px] text-[#F0B90B] font-medium">
                    {t('notif.predSubmitted', { dir: prediction.submittedDirection === 'up' ? t('notif.up') : t('notif.down') })}
                  </div>
                )}
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
