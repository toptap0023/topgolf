"use client";

import { useMemo, useState } from "react";
import type { Shot, ShotMetric, DistanceUnit, SpeedUnit } from "@/lib/types";
import type { SessionShots } from "@/lib/stats";
import {
  aggregateByClub,
  dispersionFor,
  metricTrend,
  consistencyTrend,
  clubTips,
  slope,
  shotShape,
  contactQuality,
  strikeVerdict,
  twoWayMiss,
  splitMisses,
  benchmarkForClub,
  shapeBreakdown,
} from "@/lib/stats";
import { CATEGORY_COLOR } from "@/lib/clubs";
import {
  fmt,
  fmt1,
  fmt2,
  lr,
  pm,
  pathDir,
  faceDir,
  distanceUnitLabel,
  speedUnitLabel,
} from "@/lib/format";
import { Card, SectionTitle, StatCard, Badge } from "./ui";
import { DispersionChart } from "./DispersionChart";
import { TrendChart } from "./TrendChart";
import { useT, useLang, type Dict } from "@/lib/i18n";

// Golf jargon (club names, StatCard labels, shot shapes, units) is never
// translated — only sentences/hints get an en/th pair.
const L = {
  noData: { en: "No data to analyze.", th: "ไม่มีข้อมูลให้วิเคราะห์" },
  shapeMix: { en: "Shape mix", th: "สัดส่วนทรงลูก" },
  filterByDay: { en: "Filter by day", th: "กรองตามวัน" },
  all: { en: "All", th: "ทั้งหมด" },
  moreDays: { en: "More days", th: "วันอื่น ๆ" },
  more: { en: "More", th: "เพิ่มเติม" },
  selectClub: { en: "Select club", th: "เลือกไม้" },
  shots: { en: "shots", th: "ช็อต" },
  buildingDistance: { en: "building distance", th: "กำลังเพิ่มระยะ" },
  coachingTitle: { en: "Coaching insights", th: "คำแนะนำจากโค้ช" },
  coachingSub: {
    en: "What to fix first — start here",
    th: "สิ่งที่ควรแก้ก่อน — ดูตรงนี้ก่อนเลย",
  },
  reliableCarryHint: {
    en: "Carry you reach ~70% of the time — use this to pick clubs",
    th: "ระยะที่ตีถึง ~70% ใช้เลือกไม้จริง",
  },
  twoWayBad: { en: "two-way miss", th: "พลาด 2 ทาง" },
  biasLeft: { en: "left bias", th: "เอียงซ้าย" },
  biasRight: { en: "right bias", th: "เอียงขวา" },
  onLine: { en: "on line", th: "ตีตรง" },
  twoWayHint: {
    en: "≥8% of carry offline both left & right = unstable face",
    th: "พลาด ≥8% ของ carry ทั้งซ้ายและขวา = หน้าไม้ไม่นิ่ง",
  },
  smashEffHint: {
    en: "vs ideal smash — how flush your contact is",
    th: "เทียบ smash ideal — โดนเต็มหน้าไม้แค่ไหน",
  },
  keyTitle: { en: "Key numbers", th: "ตัวเลขหลัก" },
  keySub: {
    en: "The numbers you make decisions with",
    th: "ตัวเลขหลักที่ใช้ตัดสินใจ",
  },
  dispRadiusHint: {
    en: "±1σ scatter radius — smaller = more accurate",
    th: "รัศมีวงกระจาย ±1σ — เล็ก = แม่น",
  },
  spread: { en: "spread", th: "ช่วงกระจาย" },
  lowerTighter: { en: "lower = tighter", th: "ยิ่งต่ำ = ยิ่งนิ่ง" },
  mishit: { en: "mishit", th: "ตีเสีย" },
  needShots: { en: "need ≥5 shots", th: "ต้องมี ≥5 ช็อต" },
  vsAvg: { en: "vs avg", th: "เทียบค่าเฉลี่ย" },
  deliveryTitle: { en: "Delivery", th: "จังหวะปะทะ (Delivery)" },
  deliverySub: {
    en: "Face & path at impact — what causes your ball flight",
    th: "หน้าไม้/วงสวิงตอนปะทะ — สาเหตุของ ball flight",
  },
  pathHint: {
    en: "R = in→out · L = out→in",
    th: "R = วงสวิง in→out · L = out→in",
  },
  faceHint: { en: "R = open · L = closed", th: "R = หน้าเปิด · L = หน้าปิด" },
  ftpHint: {
    en: "+ = face open to path · − = closed",
    th: "+ = หน้าเปิดกว่า path · − = ปิดกว่า",
  },
  launchTitle: { en: "Launch & spin", th: "Launch & spin" },
  launchSub: { en: "Launch angle + spin", th: "มุมขึ้น + สปิน" },
  sidespinHint: {
    en: "+R / −L — which way the ball curves",
    th: "+R / −L — ทิศโค้งของลูก",
  },
  spinAxisHint: {
    en: "Spin axis tilt +R / −L — which way the ball curves",
    th: "แกนสปินเอียง +R / −L — ทิศโค้งของลูก",
  },
  apexHint: { en: "Peak ball height", th: "ความสูงสูงสุดของลูก" },
  speedTitle: { en: "Speed", th: "ความเร็ว" },
  speedSub: { en: "Ball & club speed", th: "ความเร็วลูกและหัวไม้" },
  patternTitle: { en: "Shot pattern", th: "รูปแบบการกระจายลูก" },
  patternSub: {
    en: "Each dot is one shot; ellipse = ±1σ group",
    th: "จุดละ 1 ช็อต · วงรี = กลุ่ม ±1σ",
  },
  trendRange: { en: "Trend range", th: "ช่วงเวลาเทรนด์" },
  carryTrendTitle: { en: "Carry trend", th: "เทรนด์ Carry" },
  consTrendTitle: { en: "Consistency trend", th: "เทรนด์ความนิ่ง" },
  consTrendSub: {
    en: "Shot-to-shot carry spread per session",
    th: "การเหวี่ยงของ carry ในแต่ละรอบซ้อม",
  },
  sideTrendTitle: { en: "Side bias trend", th: "เทรนด์ Side bias" },
  sideTrendSub: {
    en: "+ right · − left (vs the 0 line) — which side you miss more",
    th: "+ ขวา · − ซ้าย (เทียบเส้น 0) — พลาดทางไหนบ่อยกว่า",
  },
  noTrendData: {
    en: "Not enough data in this range.",
    th: "ข้อมูลในช่วงนี้ยังไม่พอ",
  },
  workOnTitle: { en: "What to work on", th: "สิ่งที่ควรฝึก" },
  tightening: { en: "tightening ↘", th: "แคบลง ↘" },
  widening: { en: "widening ↗", th: "กว้างขึ้น ↗" },
} satisfies Dict;

// Rough "good amateur" targets per club type — shown under each stat for comparison.
const IDEAL: Record<
  string,
  { launch: string; spin: string; carry: string; total: string; ball: string }
> = {
  Driver: { launch: "13–15°", spin: "2.4–2.8k", carry: "~230", total: "~250", ball: "~150" },
  Wood: { launch: "11–13°", spin: "3.0–3.7k", carry: "~205", total: "~220", ball: "~135" },
  Hybrid: { launch: "12–15°", spin: "3.8–4.5k", carry: "~190", total: "~205", ball: "~125" },
  Iron: { launch: "15–19°", spin: "5.5–7.5k", carry: "~150", total: "~160", ball: "~110" },
  Wedge: { launch: "28–32°", spin: "8–10k", carry: "~95", total: "~100", ball: "~85" },
};

// "2026-06-25" → "25 Jun". Parse as local (append T00:00) to avoid a UTC
// off-by-one day shift.
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

export function AnalyzeClient({
  sessionShots,
  distanceUnit,
  speedUnit,
}: {
  sessionShots: SessionShots[];
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
}) {
  const t = useT(L);
  const { lang } = useLang();
  const [day, setDay] = useState<string>("all"); // "all" | YYYY-MM-DD
  const [club, setClub] = useState<string>("");
  const [range, setRange] = useState(12); // trend window in months

  // Dates that actually have sessions, newest first — drives the day pills.
  const dates = useMemo(() => {
    const set = new Set(sessionShots.map((s) => s.date));
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [sessionShots]);

  // Scope the page to one day (focus) or all sessions (overview).
  const scoped = useMemo(
    () => (day === "all" ? sessionShots : sessionShots.filter((s) => s.date === day)),
    [sessionShots, day]
  );
  const allShots = useMemo(() => scoped.flatMap((s) => s.shots), [scoped]);
  const aggs = useMemo(() => aggregateByClub(allShots), [allShots]);
  // Baseline across ALL sessions — powers the "today vs avg" deltas below.
  const allAggs = useMemo(
    () => aggregateByClub(sessionShots.flatMap((s) => s.shots)),
    [sessionShots]
  );
  const clubs = aggs.map((a) => a.club);
  // The selected club may not exist in the current scope (e.g. not hit that
  // day) — fall back to the first available club instead of showing nothing.
  const activeClub = clubs.includes(club) ? club : clubs[0] ?? "";

  const agg = aggs.find((a) => a.club === activeClub);
  const baseAgg = allAggs.find((a) => a.club === activeClub);
  const bm = benchmarkForClub(activeClub);
  const clubShots = useMemo(
    () => splitMisses(allShots.filter((s: Shot) => s.club === activeClub)).clean,
    [allShots, activeClub]
  );
  const disp = useMemo(() => dispersionFor(clubShots), [clubShots]);
  const shapes = useMemo(() => shapeBreakdown(clubShots), [clubShots]);

  const d = distanceUnitLabel(distanceUnit);
  const sp = speedUnitLabel(speedUnit);
  const color = agg ? CATEGORY_COLOR[agg.category] : "#16a34a";

  const cutoff = useMemo(() => {
    const d0 = new Date();
    d0.setMonth(d0.getMonth() - range);
    const tz = d0.getTimezoneOffset() * 60000;
    return new Date(d0.getTime() - tz).toISOString().slice(0, 10);
  }, [range]);
  const trendData = useMemo(
    () => sessionShots.filter((s) => s.date >= cutoff),
    [sessionShots, cutoff]
  );
  const pts = (metric: ShotMetric) =>
    metricTrend(trendData, metric, activeClub).map((p) => ({
      date: p.date,
      value: p.value,
    }));
  const carryPts = pts("carry_distance");
  const sidePts = pts("carry_deviation_distance");
  const consPts = consistencyTrend(trendData, activeClub).map((p) => ({
    date: p.date,
    value: p.value,
  }));
  const carrySeries = [{ label: "Carry", color, points: carryPts }];
  const consSeries = [{ label: "Carry σ", color: "#ff9f0a", points: consPts }];
  const sideSeries = [{ label: "Side", color: "#0a84ff", points: sidePts }];

  const carrySlope = slope(carryPts);
  const consSlope = slope(consPts);

  if (!agg)
    return <p className="text-sm text-ink-muted">{t("noData")}</p>;

  const shape = shotShape(agg);
  const contact = contactQuality(agg);
  const tips = clubTips(agg);
  const idl = IDEAL[agg.category];

  // "Today vs baseline" delta — only meaningful when scoped to one day and we
  // have an all-sessions baseline for the same club. Renders a tiny arrow line.
  const showDelta = day !== "all" && !!baseAgg;
  function Delta({ value, goodWhenUp }: { value: number; goodWhenUp: boolean }) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) return null;
    const up = value > 0;
    const good = goodWhenUp ? up : !up;
    return (
      <span className={`tnum ${good ? "text-good" : "text-bad"}`}>
        {up ? "▲" : "▼"} {fmt1(Math.abs(value))} {t("vsAvg")}
      </span>
    );
  }

  // Coaching insights (derived)
  const strike = strikeVerdict(agg);
  const tw = twoWayMiss(clubShots);
  const reliableCarry = agg.carry.n ? agg.carry.mean - 0.5 * agg.carry.std : NaN;
  const smashEff = agg.smash.n ? (agg.smash.mean / agg.smashIdeal) * 100 : NaN;
  const dispRadius = Math.hypot(disp.sdX, disp.sdY);
  const aoaIdeal = agg.category === "Driver" ? "+2–5°" : "≤ 0°";

  return (
    <div className="flex flex-col gap-5">
      {/* Day + club filters pin together under the header so you can switch
          either while scrolling and compare progress across clubs and days.
          Day = segmented control, club = pills — distinct shapes so the two
          rows don't blur into one another. */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 flex flex-col gap-2 border-b border-line bg-bg-soft/95 px-4 py-2 backdrop-blur-md">
        {/* Day filter: the most-recent days as quick boxes + a dropdown for
            the rest. The day list grows without limit, so old days overflow
            into the dropdown (which shows + highlights the active one). */}
        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
          role="group"
          aria-label={t("filterByDay")}
        >
          {[
            { key: "all", label: t("all") },
            ...dates.slice(0, 4).map((dd) => ({ key: dd, label: dayLabel(dd) })),
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setDay(opt.key)}
              aria-pressed={day === opt.key}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                day === opt.key
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {dates.length > 4 &&
            (() => {
              const olderActive = dates.slice(4).includes(day);
              return (
                <div className="relative shrink-0">
                  <select
                    value={olderActive ? day : ""}
                    onChange={(e) => e.target.value && setDay(e.target.value)}
                    aria-label={t("moreDays")}
                    className={`cursor-pointer appearance-none rounded-full border py-1.5 pl-3 pr-8 text-sm font-medium focus:outline-none ${
                      olderActive
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line bg-bg-panel text-ink-muted hover:text-ink"
                    }`}
                  >
                    <option value="">{t("more")}</option>
                    {dates.slice(4).map((dd) => (
                      <option key={dd} value={dd}>
                        {dayLabel(dd)}
                      </option>
                    ))}
                  </select>
                  <span
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                    aria-hidden
                  >
                    ▾
                  </span>
                </div>
              );
            })()}
        </div>

        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
          role="group"
          aria-label={t("selectClub")}
        >
          {aggs.map((a) => (
            <button
              key={a.club}
              type="button"
              onClick={() => setClub(a.club)}
              aria-pressed={a.club === activeClub}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                a.club === activeClub
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR[a.category] }}
                aria-hidden
              />
              {a.club}
              <span className="tnum text-xs opacity-60">{a.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold text-ink">{activeClub}</h2>
        {bm ? (
          agg.carry.mean >= bm.b80 ? (
            <Badge tone="good">break-80 carry</Badge>
          ) : agg.carry.mean >= bm.b90 ? (
            <Badge tone="warn">break-90 carry</Badge>
          ) : (
            <Badge tone="info">{t("buildingDistance")}</Badge>
          )
        ) : null}
        <Badge tone={shape.tone}>{shape.label}</Badge>
        <Badge tone={contact.tone}>{contact.label} contact</Badge>
        <span className="text-sm text-ink-muted">
          · {agg.count} {t("shots")}
          {day !== "all" ? ` · ${dayLabel(day)}` : ""}
        </span>
      </div>

      {/* One club hits many shapes — the mix tells more than the single badge. */}
      {shapes.length > 1 ? (
        <p className="-mt-3 text-sm text-ink-muted">
          {t("shapeMix")}:{" "}
          {shapes.slice(0, 3).map((s, i) => (
            <span key={s.label}>
              {i > 0 ? " · " : ""}
              <span
                className={
                  s.tone === "good"
                    ? "text-good"
                    : s.tone === "bad"
                      ? "text-bad"
                      : "text-warn"
                }
              >
                {s.label}
              </span>{" "}
              <span className="tnum">{fmt(s.pct)}%</span>
            </span>
          ))}
        </p>
      ) : null}

      {/* 1 — Coaching insights (most actionable first) */}
      <div>
        <SectionTitle sub={t("coachingSub")}>{t("coachingTitle")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Strike"
            value={
              Number.isFinite(agg.attackAngle.mean)
                ? `${pm(agg.attackAngle.mean)}°`
                : "—"
            }
            unit="AoA"
            badge={{ label: strike.label, tone: strike.tone }}
            hint={strike.detail[lang]}
            ideal={aoaIdeal}
          />
          <StatCard
            label="Reliable carry"
            value={Number.isFinite(reliableCarry) ? fmt(reliableCarry) : "—"}
            unit={d}
            hint={t("reliableCarryHint")}
          />
          <StatCard
            label="Two-way miss"
            value={
              tw.n
                ? `L ${fmt(tw.leftPct)}% · R ${fmt(tw.rightPct)}%`
                : "—"
            }
            badge={
              tw.n
                ? tw.twoWay
                  ? { label: t("twoWayBad"), tone: "bad" as const }
                  : Math.max(tw.leftPct, tw.rightPct) >= 40
                    ? {
                        label:
                          tw.leftPct >= tw.rightPct
                            ? t("biasLeft")
                            : t("biasRight"),
                        tone: "warn" as const,
                      }
                    : { label: t("onLine"), tone: "good" as const }
                : undefined
            }
            hint={t("twoWayHint")}
          />
          <StatCard
            label="Smash efficiency"
            value={Number.isFinite(smashEff) ? fmt(smashEff) : "—"}
            unit="%"
            hint={t("smashEffHint")}
            ideal="100%"
          />
        </div>
      </div>

      {/* 2 — Key numbers */}
      <div>
        <SectionTitle sub={t("keySub")}>{t("keyTitle")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Avg carry"
            value={fmt(agg.carry.mean)}
            unit={d}
            hint={
              <>
                ±{fmt1(agg.carry.std)} σ
                {showDelta && baseAgg ? (
                  <span className="mt-0.5 block">
                    <Delta value={agg.carry.mean - baseAgg.carry.mean} goodWhenUp />
                  </span>
                ) : null}
              </>
            }
            max={Number.isFinite(agg.carry.max) ? fmt(agg.carry.max) : undefined}
            ideal={bm ? `90→${bm.b90} · 80→${bm.b80}` : idl?.carry}
          />
          <StatCard
            label="Dispersion radius"
            value={Number.isFinite(dispRadius) ? fmt1(dispRadius) : "—"}
            unit={d}
            hint={t("dispRadiusHint")}
          />
          <StatCard
            label="Side bias"
            value={lr(agg.lateral.mean)}
            unit={d}
            hint={`±${fmt1(agg.lateral.std)} ${t("spread")}`}
            ideal="≈ 0"
          />
          <StatCard
            label="Consistency"
            value={Number.isFinite(agg.consistency) ? fmt1(agg.consistency) : "—"}
            unit="% CV"
            hint={
              <>
                {t("lowerTighter")}
                {showDelta && baseAgg ? (
                  <span className="mt-0.5 block">
                    <Delta
                      value={agg.consistency - baseAgg.consistency}
                      goodWhenUp={false}
                    />
                  </span>
                ) : null}
              </>
            }
            ideal="< 6%"
          />
          <StatCard
            label="Miss rate"
            value={Number.isFinite(agg.missRate) ? fmt(agg.missRate) : "n/a"}
            unit={Number.isFinite(agg.missRate) ? "%" : undefined}
            hint={
              <>
                {Number.isFinite(agg.missRate)
                  ? `${agg.missCount} / ${agg.count + agg.missCount} ${t("mishit")}`
                  : t("needShots")}
                {showDelta &&
                baseAgg &&
                Number.isFinite(agg.missRate) &&
                Number.isFinite(baseAgg.missRate) ? (
                  <span className="mt-0.5 block">
                    <Delta
                      value={agg.missRate - baseAgg.missRate}
                      goodWhenUp={false}
                    />
                  </span>
                ) : null}
              </>
            }
            ideal="0%"
          />
          <StatCard
            label="Avg total"
            value={fmt(agg.total.mean)}
            unit={d}
            max={Number.isFinite(agg.total.max) ? fmt(agg.total.max) : undefined}
            ideal={idl?.total}
          />
          <StatCard
            label="Smash"
            value={fmt2(agg.smash.mean)}
            hint={
              showDelta && baseAgg ? (
                <Delta value={agg.smash.mean - baseAgg.smash.mean} goodWhenUp />
              ) : undefined
            }
            max={Number.isFinite(agg.smash.max) ? fmt2(agg.smash.max) : undefined}
            ideal={`~${agg.smashIdeal.toFixed(2)}`}
          />
        </div>
      </div>

      {/* 3 — Delivery */}
      <div>
        <SectionTitle sub={t("deliverySub")}>{t("deliveryTitle")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Club path"
            value={
              Number.isFinite(agg.clubPath.mean)
                ? `${agg.clubPath.mean > 0 ? "R" : agg.clubPath.mean < 0 ? "L" : ""}${fmt1(Math.abs(agg.clubPath.mean))}°`
                : "—"
            }
            unit={
              Number.isFinite(agg.clubPath.mean)
                ? pathDir(agg.clubPath.mean)
                : undefined
            }
            hint={t("pathHint")}
            ideal="≈ 0°"
          />
          <StatCard
            label="Club face"
            value={
              Number.isFinite(agg.face.mean)
                ? `${agg.face.mean > 0 ? "R" : agg.face.mean < 0 ? "L" : ""}${fmt1(Math.abs(agg.face.mean))}°`
                : "—"
            }
            unit={
              Number.isFinite(agg.face.mean) ? faceDir(agg.face.mean) : undefined
            }
            hint={t("faceHint")}
            ideal="≈ 0°"
          />
          <StatCard
            label="Face to path"
            value={Number.isFinite(agg.faceToPath.mean) ? `${pm(agg.faceToPath.mean)}°` : "—"}
            hint={t("ftpHint")}
            ideal="≈ 0°"
          />
        </div>
      </div>

      {/* 4 — Launch & spin */}
      <div>
        <SectionTitle sub={t("launchSub")}>{t("launchTitle")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Launch"
            value={fmt1(agg.launch.mean)}
            unit="°"
            max={Number.isFinite(agg.launch.max) ? fmt1(agg.launch.max) : undefined}
            ideal={idl?.launch}
          />
          <StatCard
            label="Spin"
            value={fmt(agg.spin.mean)}
            unit="rpm"
            max={Number.isFinite(agg.spin.max) ? fmt(agg.spin.max) : undefined}
            ideal={idl?.spin}
          />
          <StatCard
            label="Backspin"
            value={Number.isFinite(agg.backspin.mean) ? fmt(agg.backspin.mean) : "—"}
            unit="rpm"
            max={Number.isFinite(agg.backspin.max) ? fmt(agg.backspin.max) : undefined}
          />
          <StatCard
            label="Sidespin"
            value={Number.isFinite(agg.sideSpin.mean) ? lr(agg.sideSpin.mean) : "—"}
            unit="rpm"
            hint={t("sidespinHint")}
          />
          <StatCard
            label="Spin axis"
            value={Number.isFinite(agg.spinAxis.mean) ? lr(agg.spinAxis.mean, 1) : "—"}
            unit="°"
            hint={t("spinAxisHint")}
          />
          <StatCard
            label="Apex"
            value={Number.isFinite(agg.apex.mean) ? fmt1(agg.apex.mean) : "—"}
            unit="m"
            max={Number.isFinite(agg.apex.max) ? fmt1(agg.apex.max) : undefined}
            hint={t("apexHint")}
          />
        </div>
      </div>

      {/* 5 — Speed */}
      <div>
        <SectionTitle sub={t("speedSub")}>{t("speedTitle")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Ball speed"
            value={fmt1(agg.ball.mean)}
            unit={sp}
            max={Number.isFinite(agg.ball.max) ? fmt1(agg.ball.max) : undefined}
            ideal={idl?.ball}
          />
          <StatCard
            label="Club speed"
            value={Number.isFinite(agg.clubSpeed.mean) ? fmt1(agg.clubSpeed.mean) : "—"}
            unit={sp}
            max={Number.isFinite(agg.clubSpeed.max) ? fmt1(agg.clubSpeed.max) : undefined}
          />
        </div>
      </div>

      <div className={`grid gap-5 ${day === "all" ? "lg:grid-cols-2" : ""}`}>
        <Card className="p-5">
          <SectionTitle sub={t("patternSub")}>{t("patternTitle")}</SectionTitle>
          <div className="mx-auto max-w-sm">
            <DispersionChart
              dispersion={disp}
              unit={d}
              club={activeClub}
              color={color}
            />
          </div>
        </Card>

        {/* Trends need multiple sessions — hidden when focused on one day. */}
        {day === "all" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t("trendRange")}
            </span>
            <div className="flex rounded-lg border border-line p-0.5">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRange(m)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 cursor-pointer ${
                    range === m
                      ? "bg-accent text-bg"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>
          <Card className="p-5">
            <SectionTitle
              sub={
                lang === "th"
                  ? `carry เฉลี่ยต่อรอบซ้อม · ${range} เดือนล่าสุด (${d})`
                  : `Average carry per session · last ${range} mo (${d})`
              }
            >
              {t("carryTrendTitle")}
            </SectionTitle>
            <TrendChart
              series={carrySeries}
              unit={d}
              yLabel="Carry"
              empty={t("noTrendData")}
            />
          </Card>
          <Card className="p-5">
            <SectionTitle sub={t("consTrendSub")}>
              {t("consTrendTitle")}
            </SectionTitle>
            <TrendChart
              series={consSeries}
              unit={d}
              yLabel="Carry σ"
              lowerBetter
              empty={t("noTrendData")}
            />
          </Card>
          <Card className="p-5">
            <SectionTitle sub={t("sideTrendSub")}>
              {t("sideTrendTitle")}
            </SectionTitle>
            <TrendChart
              series={sideSeries}
              unit={d}
              yLabel="Side (+R / −L)"
              target={0}
              empty={t("noTrendData")}
            />
          </Card>
        </div>
        )}
      </div>

      <Card className="p-5">
        <SectionTitle
          sub={
            lang === "th"
              ? `คำแนะนำสั้น ๆ จากข้อมูล ${activeClub} ของคุณ`
              : `Quick, data-driven pointers for your ${activeClub}`
          }
        >
          {t("workOnTitle")}
        </SectionTitle>
        {carryPts.length >= 2 ? (
          <p className="mb-3 text-sm text-ink-muted">
            {lang === "th"
              ? `${range} เดือนล่าสุด · ${carryPts.length} รอบซ้อม: carry `
              : `Last ${range} mo · ${carryPts.length} sessions: carry `}
            <b className="text-ink">
              {carrySlope >= 0 ? "+" : ""}
              {carrySlope.toFixed(1)} {d}
              {lang === "th" ? "/รอบ" : "/session"}
            </b>
            {lang === "th" ? " · การกระจาย" : ", dispersion"}{" "}
            <b className={consSlope <= 0 ? "text-good" : "text-bad"}>
              {consSlope <= 0 ? t("tightening") : t("widening")}
            </b>
            .
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden
              />
              <span className="text-ink">
                {lang === "th" ? tip.th : tip.text}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
