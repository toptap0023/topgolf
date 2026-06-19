import type { ReactNode } from "react";
import type { Tone } from "@/lib/stats";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl2 border border-line bg-bg-panel shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  sub,
  right,
}: {
  children: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-ink">{children}</h2>
        {sub ? <p className="mt-0.5 text-xs text-ink-muted">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

const TONE: Record<Tone, string> = {
  good: "text-good bg-good/10",
  warn: "text-warn bg-warn/10",
  bad: "text-bad bg-bad/10",
  info: "text-ink-muted bg-bg-panel2",
};

export function Badge({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  ideal,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  ideal?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="tnum text-2xl font-bold text-ink">{value}</span>
        {unit ? <span className="text-sm text-ink-muted">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      {ideal != null ? (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-bg-panel2 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
          <span className="text-accent">ideal</span>
          <span className="tnum text-ink">{ideal}</span>
        </span>
      ) : null}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-bg-panel2 text-ink-muted">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-muted">{message}</p>
      {action}
    </Card>
  );
}
