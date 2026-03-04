/**
 * Achievement catalog — defines all possible achievements
 */

export interface AchievementDef {
  key: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  category: "trading" | "ranking" | "tier" | "milestone" | "special";
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  // Trading achievements
  { key: "first_trade", name: "初出茅庐", nameEn: "First Trade", description: "完成第一笔交易", descriptionEn: "Complete your first trade", icon: "🎯", category: "trading" },
  { key: "first_win", name: "首战告捷", nameEn: "First Win", description: "第一笔盈利交易", descriptionEn: "Your first profitable trade", icon: "✨", category: "trading" },
  { key: "trades_50", name: "半百交易", nameEn: "50 Trades", description: "累计完成50笔交易", descriptionEn: "Complete 50 trades total", icon: "📊", category: "trading" },
  { key: "trades_200", name: "交易老兵", nameEn: "Trade Veteran", description: "累计完成200笔交易", descriptionEn: "Complete 200 trades total", icon: "🎖", category: "trading" },
  { key: "win_streak_3", name: "三连胜", nameEn: "3 Win Streak", description: "连续3笔盈利", descriptionEn: "3 consecutive winning trades", icon: "🔥", category: "trading" },
  { key: "win_streak_5", name: "五连胜", nameEn: "5 Win Streak", description: "连续5笔盈利", descriptionEn: "5 consecutive winning trades", icon: "🔥", category: "trading" },
  { key: "win_streak_10", name: "十连胜", nameEn: "10 Win Streak", description: "连续10笔盈利", descriptionEn: "10 consecutive winning trades", icon: "💥", category: "trading" },
  { key: "high_conviction", name: "坚定持仓", nameEn: "High Conviction", description: "平均持仓权重≥1.0", descriptionEn: "Average hold weight ≥ 1.0", icon: "💪", category: "trading" },

  // Ranking achievements
  { key: "rank_top_1", name: "王者降临", nameEn: "Champion", description: "获得第1名", descriptionEn: "Achieve rank #1", icon: "👑", category: "ranking" },
  { key: "rank_top_3", name: "领奖台", nameEn: "Podium Finish", description: "进入前3名", descriptionEn: "Finish in top 3", icon: "🏆", category: "ranking" },
  { key: "rank_top_10", name: "精英十强", nameEn: "Top 10", description: "进入前10名", descriptionEn: "Finish in top 10", icon: "🏅", category: "ranking" },

  // Tier achievements
  { key: "tier_bronze", name: "青铜之路", nameEn: "Bronze Tier", description: "达到青铜段位", descriptionEn: "Reach Bronze tier", icon: "🥉", category: "tier" },
  { key: "tier_silver", name: "白银突破", nameEn: "Silver Tier", description: "达到白银段位", descriptionEn: "Reach Silver tier", icon: "🥈", category: "tier" },
  { key: "tier_gold", name: "黄金登顶", nameEn: "Gold Tier", description: "达到黄金段位", descriptionEn: "Reach Gold tier", icon: "🥇", category: "tier" },
  { key: "tier_platinum", name: "铂金荣耀", nameEn: "Platinum Tier", description: "达到铂金段位", descriptionEn: "Reach Platinum tier", icon: "💠", category: "tier" },
  { key: "tier_diamond", name: "钻石传说", nameEn: "Diamond Legend", description: "达到钻石段位", descriptionEn: "Reach Diamond tier", icon: "💎", category: "tier" },

  // Milestone achievements
  { key: "first_competition", name: "竞技新星", nameEn: "Rising Star", description: "完成第一场比赛", descriptionEn: "Complete your first competition", icon: "⭐", category: "milestone" },
  { key: "competitions_5", name: "常客", nameEn: "Regular", description: "参加5场比赛", descriptionEn: "Participate in 5 competitions", icon: "📅", category: "milestone" },
  { key: "competitions_15", name: "铁杆选手", nameEn: "Ironman", description: "完成一整赛季(15场)", descriptionEn: "Complete a full season (15 matches)", icon: "🗓", category: "milestone" },
  { key: "prize_100", name: "小有积蓄", nameEn: "Prize Hunter", description: "累计奖金≥100U", descriptionEn: "Earn 100+ USDT in prizes", icon: "💰", category: "milestone" },
  { key: "prize_500", name: "财富自由", nameEn: "Big Winner", description: "累计奖金≥500U", descriptionEn: "Earn 500+ USDT in prizes", icon: "💎", category: "milestone" },

  // Special achievements
  { key: "gf_qualified", name: "GF入场券", nameEn: "GF Qualified", description: "获得Grand Final参赛资格", descriptionEn: "Qualify for Grand Final", icon: "🎫", category: "special" },
  { key: "gf_participant", name: "决赛勇士", nameEn: "GF Participant", description: "参加Grand Final", descriptionEn: "Participate in Grand Final", icon: "⚔️", category: "special" },
  { key: "gf_winner", name: "赛季冠军", nameEn: "Season Champion", description: "Grand Final第1名", descriptionEn: "Win the Grand Final", icon: "🌟", category: "special" },
  { key: "prediction_oracle", name: "预言家", nameEn: "Oracle", description: "预测准确率≥70%(≥20次)", descriptionEn: "70%+ prediction accuracy (20+ predictions)", icon: "🔮", category: "special" },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENT_CATALOG.map((a) => [a.key, a]));
