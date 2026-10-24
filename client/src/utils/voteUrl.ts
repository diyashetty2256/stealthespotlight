import type { PublicState } from "../types";

// Build the audience vote link from the site the page is actually served from,
// so the QR code works on any host (Render, custom domain) and never points at localhost.
export function getVoteUrl(state: Pick<PublicState, "audienceVoteToken"> | null | undefined): string | null {
  const token = state?.audienceVoteToken;
  if (!token) return null;
  return `${window.location.origin}/vote?token=${encodeURIComponent(token)}`;
}

export function getVoterId(): string {
  const key = "sts-voter-id";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}
