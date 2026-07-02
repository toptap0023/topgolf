import type { ClubAgg } from "@/lib/stats";
import { shotShape, contactQuality } from "@/lib/stats";
import type { DistanceUnit, SpeedUnit } from "@/lib/types";
import {
  fmt,
  fmt1,
  fmt2,
  lr,
  clubPathLabel,
  faceLabel,
  distanceUnitLabel,
  speedUnitLabel,
} from "@/lib/format";
import { CATEGORY_COLOR } from "@/lib/clubs";
import { Badge } from "./ui";

const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted whitespace-nowrap";
const td = "px-3 py-2 text-sm whitespace-nowrap tnum";
// Secondary columns hidden on phones so the core numbers fit without scrolling.
const lg = "hidden md:table-cell";

export function ClubTable({
  aggs,
  distanceUnit,
  speedUnit,
}: {
  aggs: ClubAgg[];
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
}) {
  const d = distanceUnitLabel(distanceUnit);
  const sp = speedUnitLabel(speedUnit);

  if (aggs.length === 0)
    return <p className="text-sm text-ink-muted">No shots yet.</p>;

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th className={th}>Club</th>
            <th className={`${th} text-right`}>Shots</th>
            <th className={`${th} text-right`}>Carry ({d})</th>
            <th className={`${th} text-right`}>± σ</th>
            <th className={`${th} text-right`}>Total ({d})</th>
            <th className={`${th} text-right ${lg}`}>Ball ({sp})</th>
            <th className={`${th} text-right`}>Smash</th>
            <th className={`${th} text-right ${lg}`}>Launch°</th>
            <th className={`${th} text-right ${lg}`}>Spin</th>
            <th className={`${th} text-right`}>Side ({d})</th>
            <th className={`${th} ${lg}`}>Club path</th>
            <th className={`${th} ${lg}`}>Club face</th>
            <th className={th}>Shape</th>
          </tr>
        </thead>
        <tbody>
          {aggs.map((a) => {
            const contact = contactQuality(a);
            const shape = shotShape(a);
            const smashColor =
              contact.tone === "good"
                ? "text-good"
                : contact.tone === "bad"
                  ? "text-bad"
                  : contact.tone === "warn"
                    ? "text-warn"
                    : "text-ink";
            return (
              <tr
                key={a.club}
                className="border-b border-line/60 last:border-0"
              >
                <td className={`${td} font-medium`}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLOR[a.category] }}
                      aria-hidden
                    />
                    {a.club}
                  </span>
                </td>
                <td className={`${td} text-right text-ink-muted`}>{a.count}</td>
                <td className={`${td} text-right font-semibold text-ink`}>
                  {fmt(a.carry.mean)}
                </td>
                <td className={`${td} text-right text-ink-muted`}>
                  {Number.isFinite(a.carry.std) ? fmt1(a.carry.std) : "—"}
                </td>
                <td className={`${td} text-right`}>{fmt(a.total.mean)}</td>
                <td className={`${td} text-right ${lg}`}>{fmt1(a.ball.mean)}</td>
                <td className={`${td} text-right font-semibold ${smashColor}`}>
                  {fmt2(a.smash.mean)}
                </td>
                <td className={`${td} text-right ${lg}`}>{fmt1(a.launch.mean)}</td>
                <td className={`${td} text-right ${lg}`}>{fmt(a.spin.mean)}</td>
                <td className={`${td} text-right`}>{lr(a.lateral.mean)}</td>
                <td className={`${td} text-ink-muted ${lg}`}>
                  {clubPathLabel(a.clubPath.mean)}
                </td>
                <td className={`${td} text-ink-muted ${lg}`}>
                  {faceLabel(a.face.mean)}
                </td>
                <td className={td}>
                  <Badge tone={shape.tone}>{shape.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
