import type { ClubAgg } from "@/lib/stats";
import type { DistanceUnit } from "@/lib/types";
import { fmt, distanceUnitLabel } from "@/lib/format";
import { CATEGORY_COLOR } from "@/lib/clubs";

type Tone = "good" | "warn" | "bad";

/** Classify the carry gap between two neighbouring clubs. */
function gapClass(gap: number): { label: string; tone: Tone } {
  if (gap < 4) return { label: "overlap", tone: "bad" };
  if (gap < 8) return { label: "tight", tone: "warn" };
  if (gap <= 22) return { label: "good gap", tone: "good" };
  return { label: "wide gap", tone: "warn" };
}

const TONE_TEXT: Record<Tone, string> = {
  good: "text-ink-muted",
  warn: "text-warn",
  bad: "text-bad",
};

/**
 * Distance-gapping ladder: every club in the bag sorted longest → shortest,
 * showing avg carry (solid) and total (faded), plus the carry gap to the next
 * club so overlaps and missing-distance gaps jump out.
 */
export function GapMonitor({
  aggs,
  distanceUnit,
}: {
  aggs: ClubAgg[];
  distanceUnit: DistanceUnit;
}) {
  const d = distanceUnitLabel(distanceUnit);
  const rows = aggs
    .filter((a) => a.carry.n > 0 && Number.isFinite(a.carry.mean))
    .map((a) => ({
      club: a.club,
      carry: a.carry.mean,
      total:
        Number.isFinite(a.total.mean) && a.total.mean >= a.carry.mean
          ? a.total.mean
          : a.carry.mean,
      color: CATEGORY_COLOR[a.category],
    }))
    .sort((x, y) => y.carry - x.carry);

  if (rows.length < 2)
    return (
      <p className="text-sm text-ink-muted">
        ต้องมีอย่างน้อย 2 ไม้ที่มีข้อมูล carry ถึงจะดู gapping ได้
      </p>
    );

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="flex flex-col gap-1">
      {rows.map((r, i) => {
        const next = rows[i + 1];
        const gap = next ? r.carry - next.carry : null;
        const g = gap != null ? gapClass(gap) : null;
        const cw = Math.max(2, (r.carry / max) * 100);
        const tw = Math.max(cw, (r.total / max) * 100);
        return (
          <div key={r.club}>
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 truncate text-right text-xs font-medium text-ink-muted">
                {r.club}
              </span>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-bg-panel2">
                <div
                  className="absolute inset-y-0 left-0 rounded-md opacity-25"
                  style={{ width: `${tw}%`, backgroundColor: r.color }}
                  aria-hidden
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ width: `${cw}%`, backgroundColor: r.color }}
                  aria-hidden
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs tnum">
                <b className="text-ink">{fmt(r.carry)}</b>
                <span className="text-ink-muted"> / {fmt(r.total)}</span>
              </span>
            </div>
            {g && gap != null ? (
              <div className="flex items-center gap-3 py-0.5">
                <span className="w-14 shrink-0" aria-hidden />
                <span className="flex-1 text-center">
                  <span className={`text-[10px] font-medium ${TONE_TEXT[g.tone]}`}>
                    ↕ {fmt(gap)} {d} · {g.label}
                  </span>
                </span>
                <span className="w-24 shrink-0" aria-hidden />
              </div>
            ) : null}
          </div>
        );
      })}
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
        แท่งเข้ม = <b className="text-ink">carry</b> · แท่งจาง = <b>total</b>{" "}
        (รวมกลิ้ง) · เลขกลาง = ระยะห่าง carry ของไม้ที่ติดกัน —{" "}
        <span className="text-bad">overlap</span> = สองไม้ไปไกลพอกัน (มีไม้เกิน/ตีซ้ำระยะ) ·{" "}
        <span className="text-warn">wide gap</span> = ช่วงระยะที่ขาดไม้
      </p>
    </div>
  );
}
