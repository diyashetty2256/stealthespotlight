import { pool, withTransaction } from "../config/database.js";
import type {
  AdminState,
  EventSession,
  EventStatus,
  JudgeAccount,
  LeaderboardEntry,
  Participant,
  PublicState,
  PublishedResults,
  ScoreRow,
} from "../config/types.js";

type Listener = (payload: { scope: "public" | "admin"; state: PublicState | AdminState }) => void;

const listeners = new Set<Listener>();

export function onStateChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(scope: "public" | "admin", state: PublicState | AdminState) {
  for (const listener of listeners) {
    try {
      listener({ scope, state });
    } catch (error) {
      console.error("[state] listener error:", error);
    }
  }
}

/** Auto-close voting once the server-side deadline passes. */
let closeTimer: NodeJS.Timeout | null = null;

function scheduleAutoClose(deadlineAt: Date) {
  if (closeTimer) clearTimeout(closeTimer);
  const delay = deadlineAt.getTime() - Date.now();
  closeTimer = setTimeout(() => {
    void closeVoting({ reason: "deadline" }).catch((error) =>
      console.error("[state] auto-close failed:", error)
    );
  }, Math.max(0, delay));
}

function cancelAutoClose() {
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = null;
}

export async function getSession(): Promise<EventSession> {
  const row = await pool.query("SELECT * FROM event_sessions WHERE id = 1");
  return row.rows[0] as EventSession;
}

export async function getParticipants(): Promise<Participant[]> {
  const result = await pool.query("SELECT * FROM participants ORDER BY display_order ASC, number ASC");
  return result.rows as Participant[];
}

export async function getParticipantById(id: number): Promise<Participant | null> {
  const result = await pool.query("SELECT * FROM participants WHERE id = $1", [id]);
  return (result.rows[0] as Participant) ?? null;
}

/** Judge roster with the number of scores each one has on record. */
export async function getJudges(): Promise<JudgeAccount[]> {
  const result = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role,
            (SELECT COUNT(*)::int FROM scores s WHERE s.judge_id = u.id) AS score_count
     FROM users u
     WHERE u.role = 'judge'
     ORDER BY u.id`
  );
  return result.rows as JudgeAccount[];
}

/** Closes voting if the deadline has passed. Safe to call at any time. */
export async function reconcileDeadline(): Promise<EventSession> {
  const session = await getSession();
  if (session.status === "voting_open" && session.voting_deadline_at) {
    if (new Date(session.voting_deadline_at).getTime() <= Date.now()) {
      await closeVoting({ reason: "deadline" });
      return getSession();
    }
    scheduleAutoClose(new Date(session.voting_deadline_at));
  }
  return session;
}

export async function startVoting(durationSec?: number): Promise<EventSession> {
  return withTransaction(async (client) => {
    const sessionResult = await client.query("SELECT * FROM event_sessions WHERE id = 1 FOR UPDATE");
    const session = sessionResult.rows[0] as EventSession;

    if (session.status === "voting_open") {
      throw Object.assign(new Error("Voting is already open."), { status: 409 });
    }
    if (!session.active_participant_id) {
      throw Object.assign(new Error("Select a performer before opening voting."), { status: 400 });
    }

    const duration = durationSec ?? session.voting_duration_sec;
    const now = new Date();
    const deadline = new Date(now.getTime() + duration * 1000);

    const updated = await client.query(
      `UPDATE event_sessions
       SET status = 'voting_open',
           voting_opened_at = $1,
           voting_deadline_at = $2,
           voting_duration_sec = $3,
           updated_at = now()
       WHERE id = 1
       RETURNING *`,
      [now.toISOString(), deadline.toISOString(), duration]
    );

    await client.query(
      `INSERT INTO event_audit (actor_id, action, details)
       VALUES ($1, 'voting_opened', $2)`,
      [null, JSON.stringify({ participantId: session.active_participant_id, duration, deadline: deadline.toISOString() })]
    );

    const newSession = updated.rows[0] as EventSession;
    scheduleAutoClose(deadline);
    return newSession;
  });
}

export async function closeVoting(opts: {
  reason: "manual" | "deadline" | "participant_switch";
  actorId?: number;
}): Promise<EventSession> {
  const session = await withTransaction(async (client) => {
    const currentResult = await client.query("SELECT * FROM event_sessions WHERE id = 1 FOR UPDATE");
    const current = currentResult.rows[0] as EventSession;
    if (current.status !== "voting_open") return current;

    const updated = await client.query(
      `UPDATE event_sessions
       SET status = 'voting_closed', updated_at = now()
       WHERE id = 1 AND status = 'voting_open'
       RETURNING *`
    );
    const newSession = updated.rows[0] as EventSession;

    if (newSession.active_participant_id) {
      await client.query(
        `INSERT INTO scores (participant_id, judge_id, score, is_missing, submitted_at)
         SELECT $1, u.id, NULL, TRUE, now()
         FROM users u
         WHERE u.role = 'judge'
           AND NOT EXISTS (
             SELECT 1 FROM scores s WHERE s.participant_id = $1 AND s.judge_id = u.id
           )
         ON CONFLICT (participant_id, judge_id) DO NOTHING`,
        [newSession.active_participant_id]
      );
    }

    await client.query(
      `INSERT INTO event_audit (actor_id, action, details)
       VALUES ($1, 'voting_closed', $2)`,
      [opts.actorId ?? null, JSON.stringify({ reason: opts.reason })]
    );

    return newSession;
  });

  cancelAutoClose();
  await broadcastState();
  return session;
}

export async function setActiveParticipant(
  participantId: number | null,
  actorId?: number
): Promise<EventSession> {
  if (participantId !== null) {
    const participant = await getParticipantById(participantId);
    if (!participant) {
      throw Object.assign(new Error("Participant not found."), { status: 404 });
    }
  }

  const session = await withTransaction(async (client) => {
    const currentResult = await client.query("SELECT * FROM event_sessions WHERE id = 1 FOR UPDATE");
    const current = currentResult.rows[0] as EventSession;

    let effectiveId = participantId;
    if (current.status === "voting_open" && participantId !== current.active_participant_id) {
      const updated = await client.query(
        `UPDATE event_sessions SET status = 'voting_closed', updated_at = now() WHERE id = 1 AND status = 'voting_open' RETURNING *`
      );
      const closed = updated.rows[0] as EventSession;
      if (closed.active_participant_id) {
        await client.query(
          `INSERT INTO scores (participant_id, judge_id, score, is_missing, submitted_at)
           SELECT $1, u.id, NULL, TRUE, now()
           FROM users u WHERE u.role = 'judge'
             AND NOT EXISTS (SELECT 1 FROM scores s WHERE s.participant_id = $1 AND s.judge_id = u.id)
           ON CONFLICT (participant_id, judge_id) DO NOTHING`,
          [closed.active_participant_id]
        );
      }
      cancelAutoClose();
    }

    let status = current.status;
    if (current.status === "voting_open" || current.status === "voting_closed") {
      status = participantId === null ? "ready" : "voting_closed";
    }
    if (current.status === "completed") {
      status = participantId === null ? "completed" : "voting_closed";
    }

    const result = await client.query(
      `UPDATE event_sessions
       SET active_participant_id = $1, status = $2, voting_opened_at = NULL,
           voting_deadline_at = NULL, updated_at = now()
       WHERE id = 1
       RETURNING *`,
      [effectiveId, status]
    );

    await client.query(
      `INSERT INTO event_audit (actor_id, action, details)
       VALUES ($1, 'active_participant_changed', $2)`,
      [actorId ?? null, JSON.stringify({ participantId: effectiveId })]
    );

    return result.rows[0] as EventSession;
  });

  await broadcastState();
  return session;
}

/** Tie policy: higher average first, then higher total score, then fewer missing scores, then participant number. */
export async function computeLeaderboard(): Promise<LeaderboardEntry[]> {
  const [participants, judges, scores] = await Promise.all([
    getParticipants(),
    pool.query("SELECT id, display_name FROM users WHERE role = 'judge'"),
    pool.query("SELECT * FROM scores"),
  ]);

  const judgeNames = new Map<number, string>(
    (judges.rows as { id: number; display_name: string }[]).map((j) => [j.id, j.display_name])
  );
  const scoresByParticipant = new Map<number, ScoreRow[]>();
  for (const row of scores.rows as ScoreRow[]) {
    const list = scoresByParticipant.get(row.participant_id) ?? [];
    list.push(row);
    scoresByParticipant.set(row.participant_id, list);
  }

  const entries: LeaderboardEntry[] = participants.map((participant) => {
    const rows = scoresByParticipant.get(participant.id) ?? [];
    const valid = rows.filter((r) => !r.is_missing && r.score !== null);
    const missing = rows.filter((r) => r.is_missing || r.score === null);
    const totalScore = valid.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const average = valid.length > 0 ? totalScore / valid.length : null;

    return {
      rank: 0,
      tied: false,
      participant,
      average: average === null ? null : Math.round(average * 100) / 100,
      totalScore,
      validScoreCount: valid.length,
      hasAllScores: rows.length > 0 && missing.length === 0,
      missingJudgeNames: missing.map((r) => judgeNames.get(r.judge_id) ?? `Judge #${r.judge_id}`),
      scores: rows.map((r) => ({
        id: r.id,
        judgeId: r.judge_id,
        judgeName: judgeNames.get(r.judge_id) ?? `Judge #${r.judge_id}`,
        score: r.score,
        isMissing: r.is_missing,
        isCorrected: r.is_corrected,
      })),
    };
  });

  const sorted = entries.sort((a, b) => {
    const avgA = a.average ?? -1;
    const avgB = b.average ?? -1;
    if (avgB !== avgA) return avgB - avgA;
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (a.missingJudgeNames.length !== b.missingJudgeNames.length)
      return a.missingJudgeNames.length - b.missingJudgeNames.length;
    return a.participant.number - b.participant.number;
  });

  let rank = 0;
  let prevKey = "";
  sorted.forEach((entry, index) => {
    const key = `${entry.average}|${entry.totalScore}|${entry.missingJudgeNames.length}`;
    if (key !== prevKey) {
      rank = index + 1;
      prevKey = key;
    }
    entry.rank = rank;
  });

  const rankCounts = new Map<number, number>();
  for (const entry of sorted) rankCounts.set(entry.rank, (rankCounts.get(entry.rank) ?? 0) + 1);
  for (const entry of sorted) entry.tied = (rankCounts.get(entry.rank) ?? 0) > 1;

  return sorted;
}

function toPublicState(session: EventSession, participant: Participant | null): PublicState {
  return {
    title: session.title,
    club: session.club,
    status: session.status,
    activeParticipant: participant
      ? {
          id: participant.id,
          number: participant.number,
          name: participant.name,
          performance_title: participant.performance_title,
          photo_url: participant.photo_url,
        }
      : null,
    votingDeadlineAt: session.voting_deadline_at,
    votingOpenedAt: session.voting_opened_at,
    votingDurationSec: session.voting_duration_sec,
    scoringMin: session.scoring_min,
    scoringMax: session.scoring_max,
    serverTime: new Date().toISOString(),
    resultsPublished: session.results_published,
  };
}

export async function getPublicState(): Promise<PublicState> {
  const session = await reconcileDeadline();
  const participant = session.active_participant_id
    ? await getParticipantById(session.active_participant_id)
    : null;
  return toPublicState(session, participant);
}

export async function getAdminState(): Promise<AdminState> {
  const session = await reconcileDeadline();
  const participant = session.active_participant_id
    ? await getParticipantById(session.active_participant_id)
    : null;
  const leaderboard = await computeLeaderboard();
  return {
    ...toPublicState(session, participant),
    leaderboard,
    participants: await getParticipants(),
    judges: await getJudges(),
  };
}

export async function broadcastState(): Promise<void> {
  const publicState = await getPublicState();
  emit("public", publicState);
  const adminState = await getAdminState();
  emit("admin", adminState);
}

export async function publishResults(actorId?: number): Promise<void> {
  const leaderboard = await computeLeaderboard();
  const hasAnyScores = leaderboard.some((entry) => entry.average !== null);
  if (!hasAnyScores) {
    throw Object.assign(new Error("No scores to publish yet."), { status: 400 });
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE event_sessions
       SET results_published = TRUE, results_published_at = now(), status = 'completed', updated_at = now()
       WHERE id = 1`
    );
    await client.query(
      `INSERT INTO event_audit (actor_id, action, details)
       VALUES ($1, 'results_published', $2)`,
      [actorId ?? null, JSON.stringify({ participants: leaderboard.length })]
    );
  });

  await broadcastState();
}

export async function unpublishResults(actorId?: number): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE event_sessions SET results_published = FALSE, results_published_at = NULL, updated_at = now() WHERE id = 1`
    );
    await client.query(
      `INSERT INTO event_audit (actor_id, action, details) VALUES ($1, 'results_unpublished', '{}'::jsonb)`,
      [actorId ?? null]
    );
  });
  await broadcastState();
}

export async function getPublishedResults(): Promise<PublishedResults | null> {
  const session = await getSession();
  if (!session.results_published) return null;
  const leaderboard = await computeLeaderboard();
  return {
    title: session.title,
    club: session.club,
    publishedAt: session.results_published_at,
    winners: leaderboard,
  };
}

export async function resetAllScores(actorId?: number): Promise<void> {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM scores");
    await client.query(
      `UPDATE event_sessions
       SET status = 'ready', active_participant_id = NULL, voting_opened_at = NULL,
           voting_deadline_at = NULL, results_published = FALSE, results_published_at = NULL,
           updated_at = now()
       WHERE id = 1`
    );
    await client.query(
      `INSERT INTO event_audit (actor_id, action, details) VALUES ($1, 'scores_reset', '{}'::jsonb)`,
      [actorId ?? null]
    );
  });
  cancelAutoClose();
  await broadcastState();
}

export function resumeTimers(): void {
  void getSession()
    .then((session) => {
      if (session.status === "voting_open" && session.voting_deadline_at) {
        const deadline = new Date(session.voting_deadline_at);
        if (deadline.getTime() <= Date.now()) {
          return closeVoting({ reason: "deadline" }).then(() => undefined);
        }
        scheduleAutoClose(deadline);
      }
    })
    .catch((error) => console.error("[state] resume timers failed:", error));
}
