import { fmt, formatDateShort } from "@/lib/format";
import { niceTicks, pickIndices } from "@/lib/chart";

export interface TrendSeries {
  label: string;
  color: string;
  points: { date: string; value: number }[];
}

/** Multi-series line chart over time (one point per session/round).
 *  Optional dashed target reference line (e.g. score goal of 85). */
export function TrendChart({
  series,
  unit,
  yLabel,
  target,
  lowerBetter,
  height = 220,
  empty = "Not enough sessions yet.",
  labelFmt = formatDateShort,
}: {
  series: TrendSeries[];
  unit?: string;
  yLabel?: string;
  target?: number;
  lowerBetter?: boolean;
  height?: number;
  empty?: string;
  labelFmt?: (iso: string) => string;
}) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0)
    return <p className="text-sm text-ink-muted">{empty}</p>;

  const dates = Array.from(new Set(all.map((p) => p.date))).sort();
  const xIndex = new Map(dates.map((d, i) => [d, i]));
  const n = dates.length;

  const W = 600;
  const H = height;
  const m = { top: 12, right: 16, bottom: 26, left: 40 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const values = all.map((p) => p.value).concat(target != null ? [target] : []);
  const yTicks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const yMin = Math.min(yTicks[0], ...values);
  const yMax = Math.max(yTicks[yTicks.length - 1], ...values);

  const sx = (i: number) =>
    n <= 1 ? m.left + plotW / 2 : m.left + (i / (n - 1)) * plotW;
  const sy = (v: number) => m.top + ((yMax - v) / (yMax - yMin || 1)) * plotH;

  const labelIdx = pickIndices(n, 5);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Trend chart${yLabel ? ` of ${yLabel}` : ""} across ${n} sessions.`}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={m.left}
              y1={sy(t)}
              x2={W - m.right}
              y2={sy(t)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={m.left - 6}
              y={sy(t) + 3}
              textAnchor="end"
              className="fill-ink-muted"
              style={{ fontSize: 10 }}
            >
              {fmt(t)}
            </text>
          </g>
        ))}

        {target != null ? (
          <g>
            <line
              x1={m.left}
              y1={sy(target)}
              x2={W - m.right}
              y2={sy(target)}
              stroke="#16a34a"
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />
            <text
              x={W - m.right}
              y={sy(target) - 4}
              textAnchor="end"
              className="fill-accent"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              target {fmt(target)}
            </text>
          </g>
        ) : null}

        {series.map((s, si) => {
          const pts = s.points
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date));
          const dpath = pts
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"} ${sx(xIndex.get(p.date) ?? 0).toFixed(1)} ${sy(p.value).toFixed(1)}`
            )
            .join(" ");
          return (
            <g key={si}>
              {pts.length > 1 ? (
                <path
                  d={dpath}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(xIndex.get(p.date) ?? 0)}
                  cy={sy(p.value)}
                  r={3}
                  fill={s.color}
                />
              ))}
            </g>
          );
        })}

        {labelIdx.map((i) => (
          <text
            key={i}
            x={sx(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-ink-muted"
            style={{ fontSize: 10 }}
          >
            {labelFmt(dates[i])}
          </text>
        ))}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        {series.length > 1
          ? series.map((s, si) => (
              <span key={si} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                {s.label}
              </span>
            ))
          : null}
        {yLabel ? (
          <span>
            {yLabel}
            {unit ? ` (${unit})` : ""}
          </span>
        ) : null}
        {lowerBetter ? <span>lower is better</span> : null}
      </figcaption>
    </figure>
  );
}
