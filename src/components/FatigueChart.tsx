"use client";

import type { FatiguePoint } from "@/lib/stats";
import { fmt } from "@/lib/format";
import { niceTicks, pickIndices } from "@/lib/chart";
import { useT, type Dict } from "@/lib/i18n";
import { Card, SectionTitle } from "./ui";

const L = {
  title: { en: "Fatigue", th: "ความล้า" },
  sub: {
    en: "Carry vs shot order · are you fading?",
    th: "ระยะเทียบลำดับช็อต",
  },
  empty: {
    en: "Need more shots to read fatigue.",
    th: "ช็อตยังน้อย ดูความล้าไม่ได้",
  },
  legendY: {
    en: "carry % of club session mean (100 = normal)",
    th: "carry % ของค่าเฉลี่ยไม้ในเซสชัน (100 = ปกติ)",
  },
  legendX: { en: "shot order →", th: "ลำดับช็อต →" },
  fadedPre: { en: "Carry faded", th: "ระยะช่วงท้ายตก" },
  fadedPost: {
    en: "late in the session · consider fewer balls or breaks.",
    th: "ลองตีน้อยลงหรือพัก",
  },
  steady: {
    en: "Carry held steady through the session.",
    th: "ระยะนิ่งตลอดเซสชัน",
  },
} satisfies Dict;

/** Within one range session: does carry fade as the user tires? Plots each
 *  shot's carry as a % of its club's session mean (100 = normal) over shot
 *  order, with a dashed baseline at 100. A verdict compares the first third
 *  vs the last third to flag late-session drop-off. */
export function FatigueChart({ data }: { data: FatiguePoint[] }) {
  const t = useT(L);
  const pts = data.filter(
    (p): p is FatiguePoint & { carryIdx: number } => p.carryIdx != null
  );

  if (pts.length < 8) {
    return (
      <Card className="p-5">
        <SectionTitle sub={t("sub")}>{t("title")}</SectionTitle>
        <p className="text-sm text-ink-muted">{t("empty")}</p>
      </Card>
    );
  }

  const n = pts.length;

  const W = 600;
  const H = 220;
  const m = { top: 12, right: 16, bottom: 26, left: 40 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const values = pts.map((p) => p.carryIdx).concat([100]);
  const yTicks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const yMin = Math.min(yTicks[0], ...values);
  const yMax = Math.max(yTicks[yTicks.length - 1], ...values);

  const orders = pts.map((p) => p.order);
  const xMin = Math.min(...orders);
  const xMax = Math.max(...orders);

  const sx = (order: number) =>
    xMax === xMin
      ? m.left + plotW / 2
      : m.left + ((order - xMin) / (xMax - xMin)) * plotW;
  const sy = (v: number) => m.top + ((yMax - v) / (yMax - yMin || 1)) * plotH;

  const dpath = pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${sx(p.order).toFixed(1)} ${sy(p.carryIdx).toFixed(1)}`
    )
    .join(" ");

  const labelIdx = pickIndices(n, 5);

  // Verdict: first third vs last third average carryIdx.
  const third = Math.max(1, Math.floor(n / 3));
  const avg = (arr: number[]) =>
    arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const firstAvg = avg(pts.slice(0, third).map((p) => p.carryIdx));
  const lastAvg = avg(pts.slice(n - third).map((p) => p.carryIdx));
  const drop = firstAvg - lastAvg;
  const faded = drop >= 3;

  return (
    <Card className="p-5">
      <SectionTitle sub={t("sub")}>{t("title")}</SectionTitle>

      <figure>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Fatigue chart: carry as a percent of club session mean across ${n} shots.`}
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
                className="fill-ink-muted tnum"
                style={{ fontSize: 10 }}
              >
                {fmt(t)}
              </text>
            </g>
          ))}

          <g>
            <line
              x1={m.left}
              y1={sy(100)}
              x2={W - m.right}
              y2={sy(100)}
              stroke="#16a34a"
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />
            <text
              x={W - m.right}
              y={sy(100) - 4}
              textAnchor="end"
              className="fill-accent"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              baseline 100%
            </text>
          </g>

          <path
            d={dpath}
            fill="none"
            className="stroke-accent"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={sx(p.order)}
              cy={sy(p.carryIdx)}
              r={2.5}
              className="fill-accent"
            />
          ))}

          {labelIdx.map((i) => (
            <text
              key={i}
              x={sx(pts[i].order)}
              y={H - 8}
              textAnchor="middle"
              className="fill-ink-muted tnum"
              style={{ fontSize: 10 }}
            >
              {fmt(pts[i].order)}
            </text>
          ))}
        </svg>

        <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
          <span>{t("legendY")}</span>
          <span>{t("legendX")}</span>
        </figcaption>
      </figure>

      {faded ? (
        <p className="mt-3 text-sm text-warn">
          {t("fadedPre")} {fmt(drop)}% {t("fadedPost")}
        </p>
      ) : (
        <p className="mt-3 text-sm text-good">{t("steady")}</p>
      )}
    </Card>
  );
}
