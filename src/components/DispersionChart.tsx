import type { Dispersion } from "@/lib/stats";
import { fmt, lr } from "@/lib/format";
import { niceNum, niceTicks } from "@/lib/chart";

/** SVG shot-pattern scatter: x = lateral offline (+R/−L), y = carry distance.
 *  Overlays a ±1σ ellipse and the centroid. Center dashed line = target. */
export function DispersionChart({
  dispersion,
  unit,
  color = "#16a34a",
  club,
}: {
  dispersion: Dispersion;
  unit: string;
  color?: string;
  club?: string;
}) {
  const { points, centroidX, centroidY, sdX, sdY, carry } = dispersion;
  if (points.length === 0)
    return (
      <p className="text-sm text-ink-muted">
        No dispersion data{club ? ` for ${club}` : ""} yet.
      </p>
    );

  const W = 360;
  const H = 380;
  const m = { top: 16, right: 16, bottom: 36, left: 42 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const maxAbsX = Math.max(...points.map((p) => Math.abs(p.x)), 5);
  const xMax = niceNum(maxAbsX * 1.15, false);

  const ys = points.map((p) => p.y);
  const yTicks = niceTicks(Math.min(...ys), Math.max(...ys), 4);
  const yMin = Math.min(yTicks[0], ...ys);
  const yMax = Math.max(yTicks[yTicks.length - 1], ...ys);

  const sx = (x: number) => m.left + ((x + xMax) / (2 * xMax)) * plotW;
  const sy = (y: number) =>
    m.top + ((yMax - y) / (yMax - yMin || 1)) * plotH;

  const cx = sx(centroidX);
  const cy = sy(centroidY);
  const rx = (sdX / (2 * xMax)) * plotW;
  const ry = (sdY / (yMax - yMin || 1)) * plotH;

  const xTicks = [-xMax, -xMax / 2, 0, xMax / 2, xMax];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Shot dispersion${club ? ` for ${club}` : ""}: ${points.length} shots, average carry ${fmt(centroidY)} ${unit}, lateral spread plus or minus ${fmt(sdX)} ${unit}.`}
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

        <line
          x1={sx(0)}
          y1={m.top}
          x2={sx(0)}
          y2={m.top + plotH}
          className="stroke-ink-muted"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        {sdX > 0 && sdY > 0 ? (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={color}
            fillOpacity={0.1}
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        ) : null}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={3}
            fill={color}
            fillOpacity={0.6}
          />
        ))}

        <circle cx={cx} cy={cy} r={4.5} fill="none" stroke={color} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={1.5} fill={color} />

        {xTicks.map((t, i) => (
          <text
            key={i}
            x={sx(t)}
            y={H - m.bottom + 16}
            textAnchor="middle"
            className="fill-ink-muted"
            style={{ fontSize: 10 }}
          >
            {Math.abs(t) < 0.5 ? "0" : `${Math.round(Math.abs(t))}${t < 0 ? "L" : "R"}`}
          </text>
        ))}
        <text
          x={m.left}
          y={H - 6}
          textAnchor="start"
          className="fill-ink-muted"
          style={{ fontSize: 10 }}
        >
          ← Left
        </text>
        <text
          x={W - m.right}
          y={H - 6}
          textAnchor="end"
          className="fill-ink-muted"
          style={{ fontSize: 10 }}
        >
          Right →
        </text>
      </svg>

      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span>
          Carry <b className="tnum text-ink">{fmt(carry.mean)}</b> ±
          {fmt(carry.std)} {unit}
        </span>
        <span>
          Avg side <b className="tnum text-ink">{lr(centroidX)}</b>
        </span>
        <span>
          Lateral spread ±<b className="tnum text-ink">{fmt(sdX)}</b> {unit}
        </span>
        <span>{points.length} shots</span>
      </figcaption>
    </figure>
  );
}
