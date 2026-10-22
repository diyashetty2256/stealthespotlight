import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from the repo root regardless of the process working directory.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config(); // also allow a local server/.env override

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    console.warn(`[env] Missing ${name}, using fallback default`);
    return fallback ?? "";
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  sessionSecret: required("SESSION_SECRET", "dev-only-insecure-secret-change-me"),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/authorcraft_sts",
  scoring: {
    min: parseInt(process.env.SCORING_MIN ?? "0", 10),
    max: parseInt(process.env.SCORING_MAX ?? "10", 10),
    step: parseInt(process.env.SCORING_STEP ?? "1", 10),
  },
  votingDurationSeconds: parseInt(process.env.VOTING_DURATION_SECONDS ?? "10", 10),
  allowScoreCorrections: process.env.ALLOW_SCORE_CORRECTIONS !== "false",
};
