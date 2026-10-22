import { pool } from "../config/database.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'judge')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id                SERIAL PRIMARY KEY,
  number            INTEGER NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  performance_title TEXT,
  photo_url         TEXT,
  display_order     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_sessions (
  id                    SERIAL PRIMARY KEY,
  title                 TEXT NOT NULL DEFAULT 'Steal the Spotlight',
  club                  TEXT NOT NULL DEFAULT 'Authorcraft',
  status                TEXT NOT NULL DEFAULT 'ready'
                        CHECK (status IN ('ready','voting_open','voting_closed','completed')),
  active_participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  voting_opened_at      TIMESTAMPTZ,
  voting_deadline_at    TIMESTAMPTZ,
  voting_duration_sec   INTEGER NOT NULL DEFAULT 10,
  results_published     BOOLEAN NOT NULL DEFAULT FALSE,
  results_published_at  TIMESTAMPTZ,
  scoring_min           INTEGER NOT NULL DEFAULT 0,
  scoring_max           INTEGER NOT NULL DEFAULT 10,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scores (
  id             SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  judge_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score          INTEGER,
  is_missing     BOOLEAN NOT NULL DEFAULT FALSE,
  is_corrected   BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, judge_id)
);

CREATE TABLE IF NOT EXISTS score_audit (
  id         SERIAL PRIMARY KEY,
  score_id   INTEGER REFERENCES scores(id) ON DELETE SET NULL,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  old_value  TEXT,
  new_value  TEXT,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_audit (
  id         SERIAL PRIMARY KEY,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_order ON participants(display_order);
CREATE INDEX IF NOT EXISTS idx_scores_participant ON scores(participant_id);
`;

export async function runMigrations(): Promise<void> {
  await pool.query(SCHEMA);

  const existing = await pool.query("SELECT id FROM event_sessions LIMIT 1");
  if (existing.rowCount === 0) {
    await pool.query("INSERT INTO event_sessions (id) VALUES (1)");
  }
}

async function main() {
  console.log("Running migrations...");
  await runMigrations();
  console.log("Migrations complete.");
  await pool.end();
}

const isDirectRun = process.argv[1]?.includes("migrate");
if (isDirectRun) {
  main().catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
}
