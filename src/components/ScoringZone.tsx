"use client";

import type { CarryBand } from "@/lib/stats";
import type { DistanceUnit } from "@/lib/types";
import { fmt, distanceUnitLabel } from "@/lib/format";
import { CATEGORY_COLOR } from "@/lib/clubs";
import { useT, type Dict } from "@/lib/i18n";
import { Card, SectionTitle } from "./ui";

const L = {
  title: { en: "Scoring zones (carry)", th: "โซนทำสกอร์ (carry)" },
  sub: {
    en: "Carry P25–P75 per club — mind the gaps",
    th: "ช่วงระยะจริงต่อไม้ ดูช่องว่าง",
  },
  empty: { en: "No carry data yet.", th: "ยังไม่มีข้อมูลระยะ" },
  gap: { en: "gap", th: "ห่าง" },
  cap1: {
    en: "Bar = middle 50% of your carries (P25–P75); the line is your median.",
    th: "แถบ = ครึ่งกลางของระยะ carry (P25–P75) เส้นคือค่ากลาง",
  },
  cap2Pre: { en: "Rows under", th: "ไม้ต่ำกว่า" },
  cap2Post: { en: "are the scoring zone.", th: "คือโซนทำสกอร์" },
} satisfies Dict;

/** Carries under this many units are "scoring zone" clubs (wedges / short
 *  irons) where amateurs bleed strokes — highlight those rows. */
const SCORING_MAX = 130;
/** A jump between neighbouring clubs' medians counts as a gap when it is both
 *  unusually large vs the typical gap AND meaningful in absolute terms. */
const GAP_FACTOR = 1.4;
const GAP_MIN = 20;

/**
 * Yardage ladder: each club's carry working-range (P25→P75) drawn as a CSS bar
 * on one shared distance scale, with a median marker and gap callouts. Pure
 * server render from `carryBands()` output — no client JS, no chart lib.
 */
export function ScoringZone({
  bands,
  distanceUnit,
}: {
  bands: CarryBand[];
  distanceUnit: DistanceUnit;
}) {
  const d = distanceUnitLabel(distanceUnit);
  const t = useT(L);

  if (bands.length === 0)
    return (
      <Card className="p-5">
        <SectionTitle sub={t("sub")}>{t("title")}</SectionTitle>
        <p className="text-sm text-ink-muted">{t("empty")}</p>
      </Card>
    );

  // Shared horizontal scale: from 0 up to the widest P75 across the bag, so bar
  // widths/positions are comparable club-to-club.
  const max = Math.max(...bands.map((b) => b.p75), 1);

  // Gaps between consecutive medians (bag order). Flag any that are both a lot
  // bigger than the typical gap and large in absolute units.
  const jumps: number[] = [];
  for (let i = 0; i < bands.length - 1; i++)
    jumps.push(Math.abs(bands[i].p50 - bands[i + 1].p50));
  const sorted = [...jumps].sort((a, b) => a - b);
  const medianGap = sorted.length
    ? sorted[Math.floor(sorted.length / 2)]
    : 0;
  const gapThreshold = Math.max(GAP_MIN, medianGap * GAP_FACTOR);

  const pct = (v: number) => (v / max) * 100;

  return (
    <Card className="p-5">
      <SectionTitle sub={t("sub")}>{t("title")}</SectionTitle>

      <div className="flex flex-col gap-1">
        {bands.map((b, i) => {
          const left = pct(b.p25);
          const width = Math.max(pct(b.p75) - left, 1.5);
          const mid = pct(b.p50);
          const color = CATEGORY_COLOR[b.category];
          const scoring = b.p50 < SCORING_MAX;
          const jump = jumps[i];
          const gap = jump != null && jump >= gapThreshold ? jump : null;

          return (
            <div key={b.club}>
              <div
                className={`flex items-center gap-2 rounded ${
                  scoring ? "border-l-2 border-accent pl-1.5" : "pl-[calc(0.5rem+2px)]"
                }`}
              >
                <span
                  className={`w-12 shrink-0 truncate text-right text-xs font-medium ${
                    scoring ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {b.club}
                </span>

                <div className="relative h-6 flex-1 rounded bg-bg-panel2">
                  {/* P25→P75 working-range bar */}
                  <div
                    className="absolute inset-y-1 rounded-full opacity-80"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: color,
                    }}
                    aria-hidden
                  />
                  {/* median (P50) marker */}
                  <div
                    className="absolute inset-y-0.5 w-px bg-ink"
                    style={{ left: `${mid}%` }}
                    aria-hidden
                  />
                </div>

                <span className="w-16 shrink-0 text-right text-xs tnum text-ink">
                  {fmt(b.p50)}{" "}
                  <span className="text-ink-muted">{d}</span>
                </span>
              </div>

              {gap != null ? (
                <div className="flex items-center gap-2 pl-[calc(0.5rem+2px)]">
                  <span className="w-12 shrink-0" aria-hidden />
                  <span className="flex-1 text-center text-xs text-warn">
                    {t("gap")} ~{fmt(gap)} {d}
                  </span>
                  <span className="w-16 shrink-0" aria-hidden />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <figcaption className="mt-3 space-y-0.5 text-xs text-ink-muted">
        <p>
          {t("cap1")} {t("cap2Pre")} {SCORING_MAX} {d} {t("cap2Post")}
        </p>
      </figcaption>
    </Card>
  );
}
