import { Bot } from 'lucide-react';
import { RANK_TIERS } from '@/lib/types';
import { useT } from '@/lib/i18n';

export function BotBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-medium">
      <Bot className="w-2.5 h-2.5" /> BOT
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const { lang } = useT();
  const t = RANK_TIERS.find((r) => r.tier === tier);
  if (!t) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium"
      style={{ background: `${t.color}20`, color: t.color }}
    >
      {t.icon} {lang === 'zh' ? t.label : t.labelEn}
    </span>
  );
}
