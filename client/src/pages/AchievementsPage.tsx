import { useT } from "@/lib/i18n";
import { useAchievementsQuery } from "@/hooks/useCompetitionData";
import { ACHIEVEMENT_CATALOG, type AchievementDef } from "@shared/achievements";
import { Lock } from "lucide-react";

interface UserAchievement {
  achievementKey: string;
  unlockedAt: number;
  competitionId: number | null;
}

const CATEGORY_ORDER = ["trading", "ranking", "tier", "milestone", "special"];

export default function AchievementsPage() {
  const { t } = useT();
  const { data: achievementsData, isLoading: loading } = useAchievementsQuery();

  const unlocked = new Map<string, UserAchievement>();
  if (achievementsData) {
    for (const a of achievementsData as UserAchievement[]) {
      unlocked.set(a.achievementKey, a);
    }
  }

  const unlockedCount = unlocked.size;
  const totalCount = ACHIEVEMENT_CATALOG.length;
  const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const grouped = new Map<string, AchievementDef[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const ach of ACHIEVEMENT_CATALOG) {
    const list = grouped.get(ach.category) ?? [];
    list.push(ach);
    grouped.set(ach.category, list);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    trading: t('achieve.cat.trading'),
    ranking: t('achieve.cat.ranking'),
    tier: t('achieve.cat.tier'),
    milestone: t('achieve.cat.milestone'),
    special: t('achieve.cat.special'),
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white mb-1">{t('achieve.title')}</h1>
        <p className="text-[#848E9C] text-sm">{t('achieve.unlocked', { done: unlockedCount, total: totalCount })}</p>
      </div>

      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#D1D4DC] text-sm font-semibold">{t('achieve.progress')}</span>
          <span className="text-[#F0B90B] font-mono text-sm font-bold">{progress}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/60 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const achievements = grouped.get(cat) ?? [];
        if (achievements.length === 0) return null;
        return (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">{CATEGORY_LABELS[cat] ?? cat}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {achievements.map((ach) => {
                const isUnlocked = unlocked.has(ach.key);
                const data = unlocked.get(ach.key);
                return (
                  <div
                    key={ach.key}
                    className={`relative rounded-xl border p-4 transition-all ${
                      isUnlocked
                        ? "bg-[#1C2030] border-[#F0B90B]/30 shadow-[0_0_12px_rgba(240,185,11,0.1)]"
                        : "bg-[#1C2030]/50 border-[rgba(255,255,255,0.06)] opacity-50"
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {isUnlocked ? ach.icon : <Lock className="w-6 h-6 text-[#5E6673]" />}
                    </div>
                    <div className={`text-xs font-semibold mb-0.5 ${isUnlocked ? "text-[#D1D4DC]" : "text-[#5E6673]"}`}>
                      {ach.name}
                    </div>
                    <div className={`text-[10px] ${isUnlocked ? "text-[#848E9C]" : "text-[#5E6673]"}`}>
                      {ach.description}
                    </div>
                    {isUnlocked && data && (
                      <div className="mt-2 text-[9px] text-[#F0B90B]">
                        {t('achieve.unlockedAt', { date: new Date(data.unlockedAt).toLocaleDateString("zh-CN") })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
