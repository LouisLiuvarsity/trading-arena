import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Achievement } from '@/hooks/useAchievements';

interface Props {
  achievements: Achievement[];
}

// ─── Gold Particle Burst: consecutive 3 profits ─────────────────────
function GoldParticleBurst() {
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      angle: (i / 15) * 360,
      distance: 80 + Math.random() * 120,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.2,
    })), []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.5, ease: 'easeOut' }}
      className="absolute inset-0 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 2, times: [0, 0.3, 1] }}
        className="text-[#F0B90B] text-4xl font-bold drop-shadow-[0_0_20px_rgba(240,185,11,0.6)]"
      >
        3 in a Row!
      </motion.div>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
          className="absolute rounded-full bg-[#F0B90B]"
          style={{ width: p.size, height: p.size }}
        />
      ))}
    </motion.div>
  );
}

// ─── Welcome Text: first trade ──────────────────────────────────────
function WelcomeText() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 1.05] }}
      transition={{ duration: 2.5, times: [0, 0.2, 0.7, 1] }}
      className="absolute inset-0 flex items-center justify-center"
    >
      <div className="text-center">
        <div className="text-[#F0B90B] text-3xl md:text-5xl font-bold tracking-wide drop-shadow-[0_0_30px_rgba(240,185,11,0.4)]">
          Welcome to the Arena
        </div>
        <div className="text-[#848E9C] text-sm mt-2">First trade opened</div>
      </div>
    </motion.div>
  );
}

// ─── Green Edge Glow: big win (+5%) ─────────────────────────────────
function GreenEdgeGlow({ pnlPct }: { pnlPct?: unknown }) {
  const pct = typeof pnlPct === 'number' ? pnlPct.toFixed(1) : '5+';
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 2, times: [0, 0.3, 1] }}
        className="absolute inset-0"
        style={{ boxShadow: 'inset 0 0 80px 20px rgba(14, 203, 129, 0.4)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 1, 0], y: [20, 0, -10] }}
        transition={{ duration: 2, times: [0, 0.3, 1] }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#0ECB81] text-3xl font-bold drop-shadow-[0_0_20px_rgba(14,203,129,0.6)]"
      >
        +{pct}%
      </motion.div>
    </>
  );
}

// ─── Red Flash + Shake hint: big loss (-5%) ─────────────────────────
function RedFlash() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.5, 0, 0.3, 0] }}
      transition={{ duration: 1, times: [0, 0.15, 0.3, 0.5, 0.8] }}
      className="absolute inset-0"
      style={{ boxShadow: 'inset 0 0 60px 15px rgba(246, 70, 93, 0.3)' }}
    />
  );
}

// ─── Gold Rank Crown: enter TOP 10 ──────────────────────────────────
function GoldRankCrown({ rank }: { rank?: unknown }) {
  const rankNum = typeof rank === 'number' ? rank : '?';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 1] }}
      transition={{ duration: 3, times: [0, 0.2, 0.6, 1] }}
      className="absolute inset-0 flex items-center justify-center"
    >
      <div className="text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.8, repeat: 2 }}
          className="text-5xl mb-2"
        >
          👑
        </motion.div>
        <div className="text-[#F0B90B] text-4xl font-bold animate-pulse-gold drop-shadow-[0_0_20px_rgba(240,185,11,0.5)]">
          #{rankNum}
        </div>
        <div className="text-[#F0B90B]/70 text-sm mt-1">TOP 10!</div>
      </div>
    </motion.div>
  );
}

// ─── Red Border Flash: drop from TOP 100 ────────────────────────────
function RedBorderFlash() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.8, 0, 0.6, 0] }}
      transition={{ duration: 1.5, times: [0, 0.15, 0.3, 0.45, 0.7] }}
      className="absolute inset-0 border-4 border-[#F6465D]"
      style={{ boxShadow: 'inset 0 0 30px rgba(246, 70, 93, 0.3)' }}
    />
  );
}

// ─── Main Overlay ───────────────────────────────────────────────────
export default function AchievementOverlay({ achievements }: Props) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]">
      <AnimatePresence>
        {achievements.map(a => {
          switch (a.type) {
            case 'consecutive_profits':
              return <GoldParticleBurst key={a.id} />;
            case 'first_trade':
              return <WelcomeText key={a.id} />;
            case 'big_win':
              return <GreenEdgeGlow key={a.id} pnlPct={a.data?.pnlPct} />;
            case 'big_loss':
              return <RedFlash key={a.id} />;
            case 'enter_top10':
              return <GoldRankCrown key={a.id} rank={a.data?.rank} />;
            case 'drop_from_top100':
              return <RedBorderFlash key={a.id} />;
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </div>
  );
}
