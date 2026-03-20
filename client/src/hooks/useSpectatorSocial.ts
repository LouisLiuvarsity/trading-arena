import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';

const HEARTBEAT_INTERVAL = 20_000; // 20s
const REACTION_POLL_INTERVAL = 3_000; // 3s

function getViewerId(): string {
  const KEY = 'spectator_viewer_id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

interface ReactionItem {
  id: string; // unique key for React rendering
  emoji: string;
  timestamp: number;
}

export function useSpectatorSocial(competitionId: number | null) {
  const [viewerCount, setViewerCount] = useState(0);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const lastReactionTs = useRef(0);
  const viewerId = useRef<string>('');

  // Initialize viewerId on mount
  useEffect(() => {
    viewerId.current = getViewerId();
  }, []);

  // ─── Heartbeat: keep viewer alive + get count ─────────────────────────
  useEffect(() => {
    if (!competitionId) return;

    const sendHeartbeat = async () => {
      try {
        const res = await apiRequest<{ viewerCount: number }>(
          '/api/public/spectator/heartbeat',
          {
            method: 'POST',
            body: { competitionId, viewerId: viewerId.current },
          },
        );
        setViewerCount(res.viewerCount);
      } catch {
        // silently ignore heartbeat failures
      }
    };

    // Send immediately, then every 20s
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [competitionId]);

  // ─── Poll reactions from other viewers ────────────────────────────────
  useEffect(() => {
    if (!competitionId) return;

    const pollReactions = async () => {
      try {
        const since = lastReactionTs.current;
        const res = await apiRequest<{ reactions: Array<{ emoji: string; timestamp: number }> }>(
          `/api/public/spectator/reactions?competitionId=${competitionId}&since=${since}`,
        );
        if (res.reactions.length > 0) {
          const newItems: ReactionItem[] = res.reactions.map((r, i) => ({
            id: `${r.timestamp}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            emoji: r.emoji,
            timestamp: r.timestamp,
          }));
          setReactions((prev) => [...prev, ...newItems].slice(-80)); // keep max 80
          lastReactionTs.current = Math.max(
            ...res.reactions.map((r) => r.timestamp),
          );
        }
      } catch {
        // silently ignore poll failures
      }
    };

    pollReactions();
    const interval = setInterval(pollReactions, REACTION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [competitionId]);

  // ─── Send a reaction ──────────────────────────────────────────────────
  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!competitionId) return;
      try {
        await apiRequest('/api/public/spectator/react', {
          method: 'POST',
          body: { competitionId, viewerId: viewerId.current, emoji },
        });
      } catch {
        // silently ignore (rate limited or error)
      }
    },
    [competitionId],
  );

  // ─── Remove expired reactions (after animation completes) ─────────────
  const removeReaction = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { viewerCount, reactions, sendReaction, removeReaction };
}
