import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Allowed emojis (must match server ALLOWED_EMOJIS) ── */
const EMOJIS = ['🔥', '🚀', '📉', '💀', '😱', '🎯', '💰', '📈', '🤖', '⚡', '👀', '🏆'];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Emoji Reaction Bar — row of clickable emoji buttons                       */
/* ─────────────────────────────────────────────────────────────────────────── */

interface EmojiReactionBarProps {
  onReact: (emoji: string) => void;
}

export function EmojiReactionBar({ onReact }: EmojiReactionBarProps) {
  const [cooldown, setCooldown] = useState(false);
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const handleClick = useCallback(
    (emoji: string) => {
      if (cooldown) return;
      onReact(emoji);
      setLastClicked(emoji);
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
        setLastClicked(null);
      }, 2000);
    },
    [cooldown, onReact],
  );

  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji)}
          disabled={cooldown}
          className={`
            relative flex h-7 w-7 items-center justify-center rounded-lg text-base
            transition-all duration-150 select-none
            ${cooldown
              ? 'cursor-not-allowed opacity-40'
              : 'cursor-pointer hover:scale-125 hover:bg-white/[0.08] active:scale-95'
            }
            ${lastClicked === emoji ? 'scale-125 bg-white/[0.08]' : ''}
          `}
          title={emoji}
        >
          {emoji}
          {lastClicked === emoji && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#0ECB81] animate-ping" />
          )}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Floating Emojis — emojis that float upward over the chart area            */
/* ─────────────────────────────────────────────────────────────────────────── */

interface FloatingReaction {
  id: string;
  emoji: string;
  timestamp: number;
}

interface FloatingEmojisProps {
  reactions: FloatingReaction[];
  onRemove: (id: string) => void;
}

export function FloatingEmojis({ reactions, onRemove }: FloatingEmojisProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r) => (
        <FloatingEmoji key={r.id} reaction={r} onDone={() => onRemove(r.id)} />
      ))}
    </div>
  );
}

/* ── Single floating emoji with CSS animation ── */

function FloatingEmoji({
  reaction,
  onDone,
}: {
  reaction: FloatingReaction;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Random horizontal position (10% to 90%)
  const [x] = useState(() => 10 + Math.random() * 80);
  // Random animation duration (2.5s to 4s)
  const [duration] = useState(() => 2500 + Math.random() * 1500);
  // Random slight horizontal drift
  const [drift] = useState(() => -20 + Math.random() * 40);

  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div
      ref={ref}
      className="absolute text-2xl sm:text-3xl"
      style={{
        left: `${x}%`,
        bottom: '5%',
        animation: `floatUp ${duration}ms ease-out forwards`,
        // CSS custom property for drift
        ['--drift' as string]: `${drift}px`,
      }}
    >
      {reaction.emoji}
    </div>
  );
}

/* ── Inject keyframes via a style tag (only once) ── */

const STYLE_ID = 'emoji-float-keyframes';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes floatUp {
      0% {
        opacity: 1;
        transform: translateY(0) translateX(0) scale(1);
      }
      50% {
        opacity: 0.9;
        transform: translateY(-40vh) translateX(var(--drift, 0px)) scale(1.1);
      }
      100% {
        opacity: 0;
        transform: translateY(-80vh) translateX(calc(var(--drift, 0px) * 1.5)) scale(0.6);
      }
    }
  `;
  document.head.appendChild(style);
}
