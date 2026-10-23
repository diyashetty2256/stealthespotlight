import crypto from "node:crypto";

export function generateAudienceRoundToken(): string {
  return crypto.randomBytes(18).toString("hex").slice(0, 24);
}

export function validateAudienceScore(score: number, min: number, max: number): boolean {
  if (!Number.isFinite(score)) return false;
  return Number.isInteger(score) && score >= min && score <= max;
}
