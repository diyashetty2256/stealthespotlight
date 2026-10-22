export type Role = "admin" | "judge";
export type EventStatus = "ready" | "voting_open" | "voting_closed" | "completed";

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: Role;
}

export interface Participant {
  id: number;
  number: number;
  name: string;
  performance_title: string | null;
  photo_url: string | null;
  display_order: number;
}

export interface EventSession {
  id: number;
  title: string;
  club: string;
  status: EventStatus;
  active_participant_id: number | null;
  voting_opened_at: string | null;
  voting_deadline_at: string | null;
  voting_duration_sec: number;
  results_published: boolean;
  results_published_at: string | null;
  scoring_min: number;
  scoring_max: number;
}

export interface ScoreRow {
  id: number;
  participant_id: number;
  judge_id: number;
  score: number | null;
  is_missing: boolean;
  is_corrected: boolean;
  submitted_at: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  tied: boolean;
  participant: Participant;
  average: number | null;
  totalScore: number;
  validScoreCount: number;
  hasAllScores: boolean;
  missingJudgeNames: string[];
  scores: {
    id: number;
    judgeId: number;
    judgeName: string;
    score: number | null;
    isMissing: boolean;
    isCorrected: boolean;
  }[];
}

/** Public state — safe for audience and judge screens. Never contains scores. */
export interface PublicState {
  title: string;
  club: string;
  status: EventStatus;
  activeParticipant: Pick<Participant, "id" | "number" | "name" | "performance_title" | "photo_url"> | null;
  votingDeadlineAt: string | null;
  votingOpenedAt: string | null;
  votingDurationSec: number;
  scoringMin: number;
  scoringMax: number;
  serverTime: string;
  resultsPublished: boolean;
}

export interface JudgeAccount {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  /** Number of score rows recorded for this judge (missing marks included). */
  score_count: number;
}

export interface AdminState extends PublicState {
  leaderboard: LeaderboardEntry[];
  participants: Participant[];
  judges: JudgeAccount[];
}

export interface JudgeState extends PublicState {
  mySubmission: { score: number | null; isMissing: boolean; isCorrected: boolean } | null;
}

export interface PublishedResults {
  title: string;
  club: string;
  publishedAt: string | null;
  winners: LeaderboardEntry[];
}
