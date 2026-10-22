import type { EventStatus } from "../types";

const LABELS: Record<EventStatus, string> = {
  ready: "Ready",
  voting_open: "Voting Open",
  voting_closed: "Voting Closed",
  completed: "Completed",
};

export function StatusPill({ status, className = "" }: { status: EventStatus; className?: string }) {
  const cls =
    status === "voting_open"
      ? "status-open"
      : status === "voting_closed"
        ? "status-closed"
        : status === "completed"
          ? "status-completed"
          : "status-ready";

  return (
    <span className={`status-pill ${cls} ${className}`}>
      <span className="dot" />
      {LABELS[status]}
    </span>
  );
}
