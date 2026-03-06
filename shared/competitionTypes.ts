// ============================================================
// Competition System Types — v2.0
// Shared between server and client
// ============================================================

// RankTier defined here so shared/ never depends on client/
export type RankTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// ─── Enums ──────────────────────────────────────────────────

export type CompetitionStatus =
  | "draft"
  | "announced"
  | "registration_open"
  | "registration_closed"
  | "live"
  | "settling"
  | "completed"
  | "cancelled";

export type CompetitionType = "regular" | "grand_final" | "special" | "practice";

export type RegistrationStatus = "pending" | "accepted" | "rejected" | "waitlisted" | "withdrawn";

// ─── Season ─────────────────────────────────────────────────

export interface SeasonSummary {
  id: number;
  name: string;
  slug: string;
  status: string;
  startDate: number;
  endDate: number;
  competitionCount: number;
  completedCount: number;
}

// ─── Competition ────────────────────────────────────────────

export interface CompetitionSummary {
  id: number;
  slug: string;
  title: string;
  competitionNumber: number;
  competitionType: CompetitionType;
  status: CompetitionStatus;
  maxParticipants: number;
  registeredCount: number;
  acceptedCount: number;
  prizePool: number;
  symbol: string;
  startTime: number;
  endTime: number;
  registrationOpenAt: number | null;
  registrationCloseAt: number | null;
  coverImageUrl: string | null;
  myRegistrationStatus: RegistrationStatus | null;
}

export interface CompetitionDetail extends CompetitionSummary {
  seasonId: number;
  description: string | null;
  startingCapital: number;
  maxTradesPerMatch: number;
  closeOnlySeconds: number;
  feeRate: number;
  requireMinSeasonPoints: number;
  requireMinTier: string | null;
  inviteOnly: boolean;
  participants: Array<{
    username: string;
    rankTier: RankTier;
    seasonPoints: number;
    institutionName: string | null;
    country: string | null;
  }>;
}

// ─── Registration ───────────────────────────────────────────

export interface MyRegistration {
  competitionId: number;
  competitionTitle: string;
  competitionType: CompetitionType;
  status: RegistrationStatus;
  startTime: number;
  appliedAt: number;
}

export interface AdminRegistration {
  id: number;
  competitionId: number;
  arenaAccountId: number;
  username: string;
  status: RegistrationStatus;
  seasonPoints: number;
  rankTier: RankTier;
  matchesPlayed: number;
  institutionName: string | null;
  country: string | null;
  appliedAt: number;
  reviewedAt: number | null;
}

// ─── Match Results ──────────────────────────────────────────

export interface MatchResultSummary {
  competitionId: number;
  competitionTitle: string;
  competitionNumber: number;
  finalRank: number;
  totalPnl: number;
  totalPnlPct: number;
  totalWeightedPnl: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  pointsEarned: number;
  prizeWon: number;
  prizeEligible: boolean;
  participantCount: number;
  createdAt: number;
}

export interface MatchResultDetail extends MatchResultSummary {
  bestTradePnl: number | null;
  worstTradePnl: number | null;
  avgHoldDuration: number | null;
  avgHoldWeight: number | null;
  rankTierAtTime: string | null;
  finalEquity: number;
  closeReasonStats: Record<string, number> | null;
}

// ─── Hub ────────────────────────────────────────────────────

export interface HubData {
  /** Currently active competition the user is participating in */
  activeCompetition: {
    id: number;
    slug: string;
    title: string;
    competitionType: CompetitionType;
    startTime: number;
    endTime: number;
    remainingSeconds: number;
    myRank: number;
    myPnlPct: number;
    participantCount: number;
    prizePool: number;
  } | null;

  /** User's pending/accepted registrations */
  myRegistrations: MyRegistration[];

  /** Upcoming competitions (next 5) */
  upcomingCompetitions: CompetitionSummary[];

  /** Season progress */
  season: {
    id: number;
    name: string;
    slug: string;
    matchesTotal: number;
    matchesCompleted: number;
    mySeasonPoints: number;
    myRankTier: RankTier;
    pointsToNextTier: number;
    grandFinalQualified: boolean;
    grandFinalLine: number;
    pointsCurve: Array<{ competitionNumber: number; pointsAfter: number }>;
  } | null;

  /** Recent match results (last 5) */
  recentResults: MatchResultSummary[];

  /** Quick stats */
  quickStats: {
    totalCompetitions: number;
    winRate: number;
    totalPrizeWon: number;
    bestRank: number;
    avgPnlPct: number;
  };

  /** Unread notification count */
  unreadNotificationCount: number;
}

// ─── Notifications ──────────────────────────────────────────

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string | null;
  competitionId: number | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: number;
}

// ─── Institutions & Profiles ────────────────────────────────

export interface InstitutionSummary {
  id: number;
  name: string;
  nameEn: string | null;
  shortName: string | null;
  type: string;
  country: string;
  region: string | null;
  verified: boolean;
  memberCount: number;
}

export interface UserProfileData {
  arenaAccountId: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  institutionId: number | null;
  institutionName: string | null;
  department: string | null;
  graduationYear: number | null;
  participantType: string;
  isProfilePublic: boolean;
  rankTier: RankTier;
  seasonPoints: number;
}

// ─── Stats (Geographic / Institutional) ─────────────────────

export interface CountryStats {
  country: string;
  participantCount: number;
  competitionCount: number;
  avgPnlPct: number;
  avgWinRate: number;
  totalPrizeWon: number;
  bestPlayer: { username: string; seasonPoints: number } | null;
}

export interface InstitutionStats {
  id: number;
  name: string;
  nameEn: string | null;
  shortName: string | null;
  type: string;
  country: string;
  verified: boolean;
  memberCount: number;
  activeMembers: number;
  avgPnlPct: number;
  avgWinRate: number;
  totalPrizeWon: number;
  bestRank: number;
  topPlayers: Array<{ username: string; seasonPoints: number; rankTier: RankTier }>;
}
