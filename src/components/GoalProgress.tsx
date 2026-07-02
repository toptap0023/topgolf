"use client";

import { Card } from "./ui";
import { fmt } from "@/lib/format";
import { useGoal } from "@/lib/goal";
import { useT, type Dict } from "@/lib/i18n";

const L = {
  goal: { en: "Goal", th: "เป้าหมาย" },
  avgScore: { en: "avg score", th: "สกอร์เฉลี่ย" },
  logRound: {
    en: "Log a round to start tracking",
    th: "บันทึกรอบเพื่อเริ่มติดตาม",
  },
  best: { en: "best", th: "ดีสุด" },
} satisfies Dict;

/** Visualizes progress along the score journey: start → target (user-set in Settings). */
export function GoalProgress({
  current,
  best,
}: {
  current: number | null;
  best?: number | null;
}) {
  const t = useT(L);
  const [{ start, target }] = useGoal();
  const have = current != null && Number.isFinite(current);
  // 0% at start, 100% at target. Lower score = more progress.
  const pct = have
    ? Math.max(0, Math.min(100, ((start - (current as number)) / (start - target)) * 100))
    : 0;
  const reached = have && (current as number) <= target;

  return (
    <Card className="p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {t("goal")} · {start} → {target}
          </p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {have ? (
              <>
                <span className="tnum">{fmt(current)}</span>
                <span className="ml-1 text-sm font-medium text-ink-muted">
                  {t("avgScore")}
                </span>
              </>
            ) : (
              <span className="text-base font-medium text-ink-muted">
                {t("logRound")}
              </span>
            )}
          </p>
        </div>
        <span
          className={`tnum text-sm font-semibold ${reached ? "text-good" : "text-accent"}`}
        >
          {have ? `${Math.round(pct)}%` : ""}
        </span>
      </div>

      <div className="relative mt-4 h-2.5 rounded-full bg-bg-panel2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {best != null && Number.isFinite(best) ? (
          <div
            className="absolute -top-1 h-4 w-0.5 bg-good"
            style={{
              left: `${Math.max(0, Math.min(100, ((start - best) / (start - target)) * 100))}%`,
            }}
            title={`Best: ${best}`}
          />
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
        <span className="tnum">{start}</span>
        {best != null && Number.isFinite(best) ? (
          <span className="tnum text-good">{t("best")} {fmt(best)}</span>
        ) : null}
        <span className="tnum">{target}</span>
      </div>
    </Card>
  );
}
