export interface Participant {
  id: number;
  number: number;
  name: string;
  performance_title: string | null;
  photo_url: string | null;
  display_order: number;
}

export type EventStatus = "ready" | "voting_open" | "voting_closed" | "completed";

export interface PublicState {
  title: string;
  club: string;
  status: EventStatus;
  activeParticipant: {
    id: number;
    number: number;
    name: string;
    performance_title: string | null;
    photo_url: string | null;
  } | null;
  votingDeadlineAt: string | null;
  votingOpenedAt: string | null;
  votingDurationSec: number;
  serverTime: string;
  resultsPublished: boolean;
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
    judgeId: number;
    judgeName: string;
    score: number | null;
    isMissing: boolean;
    isCorrected: boolean;
  }[];
}

export interface JudgeAccount {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "judge";
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

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "judge";
}
