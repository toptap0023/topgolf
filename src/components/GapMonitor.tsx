import type { ClubAgg } from "@/lib/stats";
import { fmt } from "@/lib/format";
import { CATEGORY_COLOR } from "@/lib/clubs";

/**
 * Distance-gapping ladder: every club sorted longest → shortest by carry,
 * showing carry (solid) + total (faded), with a small, unobtrusive carry gap
 * between neighbouring clubs.
 */
export function GapMonitor({ aggs }: { aggs: ClubAgg[] }) {
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

  if (rows.length === 0)
    return <p className="text-sm text-ink-muted">No carry data yet.</p>;

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="flex flex-col gap-1">
      {rows.map((r, i) => {
        const next = rows[i + 1];
        const gap = next ? r.carry - next.carry : null;
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
              <span className="w-20 shrink-0 text-right text-xs tnum">
                <b className="text-ink">{fmt(r.carry)}</b>
                <span className="text-ink-muted"> / {fmt(r.total)}</span>
              </span>
            </div>
            {gap != null ? (
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0" aria-hidden />
                <span className="flex-1 text-center text-[10px] tabular-nums text-ink-muted/50">
                  ↕ {fmt(gap)}
                </span>
                <span className="w-20 shrink-0" aria-hidden />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
