"use client";

import { useMemo, useState } from "react";
import type { ClubAgg } from "@/lib/stats";
import { clubForDistance } from "@/lib/stats";
import type { DistanceUnit } from "@/lib/types";
import { fmt, distanceUnitLabel } from "@/lib/format";
import { CATEGORY_COLOR } from "@/lib/clubs";
import { useT, type Dict } from "@/lib/i18n";
import { Card, SectionTitle } from "./ui";

const QUICK_PICKS = [100, 120, 140, 160, 180];

const L = {
  title: { en: "Caddy · club by distance", th: "แคดดี้ · เลือกไม้ตามระยะ" },
  sub: { en: "Enter a distance, get the right club", th: "ใส่ระยะแล้วเลือกไม้ให้" },
  empty: {
    en: "Import range shots to use the caddy.",
    th: "อัปข้อมูลซ้อมก่อนใช้ตัวช่วยเลือกไม้",
  },
  toTarget: { en: "to target", th: "ถึงเป้า" },
  noMatch: { en: "No club matches yet.", th: "ยังไม่มีไม้ที่เข้ากับระยะนี้" },
  nextBest: { en: "Next best", th: "ตัวเลือกถัดไป" },
  spotOn: { en: "spot on", th: "ระยะพอดี" },
  shortPre: { en: "comes up", th: "สั้นไป" },
  shortPost: { en: "short", th: "" },
  pastPre: { en: "flies", th: "เกินไป" },
  pastPost: { en: "past", th: "" },
  avgCarry: { en: "avg carry", th: "ระยะเฉลี่ย" },
} satisfies Dict;

/**
 * "Which club from this distance?" caddy tool. Enter a target and it ranks the
 * bag by *reliable* carry (mean − 0.5σ, the number you can actually club off)
 * so you stop mis-clubbing on course.
 */
export function CaddyCard({
  aggs,
  distanceUnit,
}: {
  aggs: ClubAgg[];
  distanceUnit: DistanceUnit;
}) {
  const d = distanceUnitLabel(distanceUnit);
  const t = useT(L);
  const [target, setTarget] = useState<number>(150);

  const picks = useMemo(() => clubForDistance(aggs, target), [aggs, target]);

  if (aggs.length === 0)
    return (
      <Card className="p-5">
        <SectionTitle sub={t("sub")}>{t("title")}</SectionTitle>
        <p className="text-sm text-ink-muted">{t("empty")}</p>
      </Card>
    );

  const top = picks[0];
  const rest = picks.slice(1, 3);

  return (
    <Card className="p-5">
      <SectionTitle sub={t("sub")}>{t("title")}</SectionTitle>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-28 rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink tnum focus:border-accent"
          aria-label={`Target distance in ${d}`}
        />
        <span className="text-sm text-ink-muted">{d} {t("toTarget")}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_PICKS.map((q) => {
          const active = q === target;
          return (
            <button
              key={q}
              type="button"
              onClick={() => setTarget(q)}
              className={`min-h-10 rounded-full border px-3 py-1.5 text-sm tnum transition-colors duration-200 cursor-pointer ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              {q}
            </button>
          );
        })}
      </div>

      {top ? (
        <TopPick pick={top} d={d} />
      ) : (
        <p className="mt-4 text-sm text-ink-muted">{t("noMatch")}</p>
      )}

      {rest.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {t("nextBest")}
          </p>
          {rest.map((p) => (
            <div
              key={p.club}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR[p.category] }}
                aria-hidden
              />
              <span className="flex-1 truncate text-ink">{p.club}</span>
              <span className="tnum text-ink-muted">
                {fmt(p.reliable)} {d}
              </span>
              <span className="tnum text-ink-muted">
                {p.diff < 0 ? "−" : "+"}
                {fmt(Math.abs(p.diff))}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function TopPick({
  pick,
  d,
}: {
  pick: ReturnType<typeof clubForDistance>[number];
  d: string;
}) {
  const t = useT(L);
  const spotOn = Math.abs(pick.diff) <= 3;
  const verdictClass = spotOn ? "text-good" : "text-warn";
  const verdict = spotOn
    ? t("spotOn")
    : pick.diff < 0
      ? `${t("shortPre")} ${fmt(-pick.diff)} ${d} ${t("shortPost")}`.trim()
      : `${t("pastPre")} ${fmt(pick.diff)} ${d} ${t("pastPost")}`.trim();

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: CATEGORY_COLOR[pick.category] }}
          aria-hidden
        />
        <span className="text-2xl font-bold text-ink">{pick.club}</span>
        <span className="tnum text-sm text-ink-muted">
          {fmt(pick.reliable)} {d}
        </span>
      </div>
      <p className={`mt-1 text-sm font-medium ${verdictClass}`}>{verdict}</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        {t("avgCarry")} <span className="tnum text-ink">{fmt(pick.mean)}</span> {d}
      </p>
    </div>
  );
}
