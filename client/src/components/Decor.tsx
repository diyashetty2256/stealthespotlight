import type { ReactNode } from "react";

export function StarDoodle({
  size = 14,
  className = "",
  delay = 0,
  style,
}: {
  size?: number;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={`star-doodle ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animationDelay: `${delay}s`, ...style }}
      aria-hidden="true"
    >
      <path
        d="M12 2c.6 4.8 5.2 9.4 10 10-4.8.6-9.4 5.2-10 10-.6-4.8-5.2-9.4-10-10 4.8-.6 9.4-5.2 10-10z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Sparkle({
  size = 8,
  className = "",
  delay = 0,
  style,
}: {
  size?: number;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={`star-doodle ${className}`}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ animationDelay: `${delay}s`, ...style }}
      aria-hidden="true"
    >
      <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="currentColor" />
    </svg>
  );
}

export function HandArrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="64" height="34" viewBox="0 0 64 34" fill="none" aria-hidden="true">
      <path
        d="M3 24 C 18 8, 40 6, 56 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1 0"
      />
      <path d="M48 8 L57 14 L49 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Hand-cut ticket stub used as a decorative card. */
export function TicketStub({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ticket-stub paper-grain ${className}`}>
      <div className="flex">
        <div className="flex-1 p-5">{children}</div>
        <div className="ticket-divider flex items-center">
          <div className="px-3 label-caps text-charcoal-ink/50" style={{ writingMode: "vertical-rl" }}>
            Admit One
          </div>
        </div>
      </div>
    </div>
  );
}

export function CurtainFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden min-h-screen stage-bg">
      <div className="curtain-valance" />
      <div className="curtain curtain-left" />
      <div className="curtain curtain-right" />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export function ScatterStars({ count = 14 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 37 + 11) % 96}%`,
    top: `${(i * 53 + 7) % 92}%`,
    size: 8 + ((i * 7) % 12),
    delay: (i % 7) * 0.45,
  }));
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {stars.map((s, i) =>
        i % 3 === 0 ? (
          <Sparkle key={i} size={s.size * 0.7} delay={s.delay} style={{ position: "absolute", left: s.left, top: s.top }} className="" />
        ) : (
          <StarDoodle key={i} size={s.size} delay={s.delay} style={{ position: "absolute", left: s.left, top: s.top }} />
        )
      )}
    </div>
  );
}

export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const colors = ["#C6A15B", "#C98686", "#651F32", "#F4E8D3", "#8f6b34"];
  const pieces = Array.from({ length: 90 }, (_, i) => ({
    left: `${(i * 61 + 3) % 100}%`,
    color: colors[i % colors.length],
    size: 6 + ((i * 13) % 10),
    delay: ((i * 17) % 40) / 10,
    duration: 3 + ((i * 11) % 20) / 10,
    shape: i % 3,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.shape === 1 ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.shape === 2 ? "999px" : "1px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
