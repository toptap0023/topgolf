import { fmt } from "@/lib/format";

export interface GapItem {
  club: string;
  mean: number;
  std: number;
  color: string;
}

/** Horizontal bar chart of average carry per club (sorted long → short),
 *  with a ±1σ band so distance gaps and overlaps are obvious. CSS bars. */
export function GappingChart({
  items,
  unit,
}: {
  items: GapItem[];
  unit: string;
}) {
  const usable = items.filter((i) => Number.isFinite(i.mean));
  if (usable.length === 0)
    return <p className="text-sm text-ink-muted">No carry data yet.</p>;

  const max = Math.max(
    ...usable.map((i) => (Number.isFinite(i.std) ? i.mean + i.std : i.mean)),
    1
  );

  return (
    <div className="flex flex-col gap-2">
      {usable.map((i) => {
        const w = Math.max(1, (i.mean / max) * 100);
        const hasStd = Number.isFinite(i.std) && i.std > 0;
        const lo = hasStd ? Math.max(0, ((i.mean - i.std) / max) * 100) : w;
        const hi = hasStd ? Math.min(100, ((i.mean + i.std) / max) * 100) : w;
        return (
          <div key={i.club} className="flex items-center gap-3">
            <span className="w-16 shrink-0 truncate text-right text-xs font-medium text-ink-muted">
              {i.club}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-bg-panel2">
              {hasStd ? (
                <div
                  className="absolute inset-y-0 bg-ink/10"
                  style={{ left: `${lo}%`, width: `${Math.max(0, hi - lo)}%` }}
                  aria-hidden
                />
              ) : null}
              <div
                className="absolute inset-y-0 left-0 rounded-md"
                style={{ width: `${w}%`, backgroundColor: i.color }}
                aria-hidden
              />
            </div>
            <span className="tnum w-12 shrink-0 text-right text-xs font-semibold text-ink">
              {fmt(i.mean)}
            </span>
          </div>
        );
      })}
      <p className="mt-1 text-[11px] text-ink-muted">
        Bars = average carry ({unit}); shaded band = ±1 std dev (shot-to-shot
        spread).
      </p>
    </div>
  );
}
