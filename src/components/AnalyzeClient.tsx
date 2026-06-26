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
  const clubs = aggs.map((a) => a.club);
  // The selected club may not exist in the current scope (e.g. not hit that
  // day) — fall back to the first available club instead of showing nothing.
  const activeClub = clubs.includes(club) ? club : clubs[0] ?? "";

  const agg = aggs.find((a) => a.club === activeClub);
  const clubShots = useMemo(
    () => splitMisses(allShots.filter((s: Shot) => s.club === activeClub)).clean,
    [allShots, activeClub]
  );
  const disp = useMemo(() => dispersionFor(clubShots), [clubShots]);

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
    return <p className="text-sm text-ink-muted">No data to analyze.</p>;

  const shape = shotShape(agg);
  const contact = contactQuality(agg);
  const tips = clubTips(agg);
  const idl = IDEAL[agg.category];

  // Coaching insights (derived)
  const strike = strikeVerdict(agg);
  const tw = twoWayMiss(clubShots);
  const reliableCarry = agg.carry.n ? agg.carry.mean - 0.5 * agg.carry.std : NaN;
  const smashEff = agg.smash.n ? (agg.smash.mean / agg.smashIdeal) * 100 : NaN;
  const dispRadius = Math.hypot(disp.sdX, disp.sdY);
  const aoaIdeal = agg.category === "Driver" ? "+2–5°" : "≤ 0°";

  return (
    <div className="flex flex-col gap-5">
      <div
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
        role="group"
        aria-label="Filter by day"
      >
        {[
          { key: "all", label: "All" },
          ...dates.map((dd) => ({ key: dd, label: dayLabel(dd) })),
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
      </div>

      <div className="no-scrollbar sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-line bg-bg-soft/95 px-4 py-2 backdrop-blur-md">
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

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold text-ink">{activeClub}</h2>
        <Badge tone={shape.tone}>{shape.label}</Badge>
        <Badge tone={contact.tone}>{contact.label} contact</Badge>
        <span className="text-sm text-ink-muted">
          · {agg.count} shots{day !== "all" ? ` · ${dayLabel(day)}` : ""}
        </span>
      </div>

      {/* 1 — Coaching insights (most actionable first) */}
      <div>
        <SectionTitle sub="สิ่งที่ควรแก้ก่อน — ดูตรงนี้ก่อนเลย">
          Coaching insights
        </SectionTitle>
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
            hint={strike.detail}
            ideal={aoaIdeal}
          />
          <StatCard
            label="Reliable carry"
            value={Number.isFinite(reliableCarry) ? fmt(reliableCarry) : "—"}
            unit={d}
            hint="ระยะที่ตีถึง ~70% ใช้เลือกไม้จริง"
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
                  ? { label: "พลาด 2 ทาง", tone: "bad" }
                  : Math.max(tw.leftPct, tw.rightPct) >= 40
                    ? {
                        label: `เอียง${tw.leftPct >= tw.rightPct ? "ซ้าย" : "ขวา"}`,
                        tone: "warn",
                      }
                    : { label: "ตีตรง", tone: "good" }
                : undefined
            }
            hint="พลาด ≥8% ของ carry ทั้งซ้ายและขวา = หน้าไม้ไม่นิ่ง"
          />
          <StatCard
            label="Smash efficiency"
            value={Number.isFinite(smashEff) ? fmt(smashEff) : "—"}
            unit="%"
            hint="เทียบ smash ideal — โดนเต็มหน้าไม้แค่ไหน"
            ideal="100%"
          />
        </div>
      </div>

      {/* 2 — Key numbers */}
      <div>
        <SectionTitle sub="ตัวเลขหลักที่ใช้ตัดสินใจ">Key numbers</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Avg carry"
            value={fmt(agg.carry.mean)}
            unit={d}
            hint={`±${fmt1(agg.carry.std)} σ`}
            max={Number.isFinite(agg.carry.max) ? fmt(agg.carry.max) : undefined}
            ideal={idl?.carry}
          />
          <StatCard
            label="Dispersion radius"
            value={Number.isFinite(dispRadius) ? fmt1(dispRadius) : "—"}
            unit={d}
            hint="รัศมีวงกระจาย ±1σ — เล็ก = แม่น"
          />
          <StatCard
            label="Side bias"
            value={lr(agg.lateral.mean)}
            unit={d}
            hint={`±${fmt1(agg.lateral.std)} spread`}
            ideal="≈ 0"
          />
          <StatCard
            label="Consistency"
            value={Number.isFinite(agg.consistency) ? fmt1(agg.consistency) : "—"}
            unit="% CV"
            hint="lower = tighter"
            ideal="< 6%"
          />
          <StatCard
            label="Miss rate"
            value={Number.isFinite(agg.missRate) ? fmt(agg.missRate) : "n/a"}
            unit={Number.isFinite(agg.missRate) ? "%" : undefined}
            hint={
              Number.isFinite(agg.missRate)
                ? `${agg.missCount} / ${agg.count + agg.missCount} mishit`
                : "need ≥5 shots"
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
            max={Number.isFinite(agg.smash.max) ? fmt2(agg.smash.max) : undefined}
            ideal={`~${agg.smashIdeal.toFixed(2)}`}
          />
        </div>
      </div>

      {/* 3 — Delivery */}
      <div>
        <SectionTitle sub="หน้าไม้/วงสวิงตอนปะทะ — สาเหตุของ ball flight">
          Delivery
        </SectionTitle>
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
            hint="R = in→out · L = out→in"
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
            hint="R = open · L = closed"
            ideal="≈ 0°"
          />
          <StatCard
            label="Face to path"
            value={Number.isFinite(agg.faceToPath.mean) ? `${pm(agg.faceToPath.mean)}°` : "—"}
            hint="+ = หน้าเปิดกว่า path · − = ปิดกว่า"
            ideal="≈ 0°"
          />
        </div>
      </div>

      {/* 4 — Launch & spin */}
      <div>
        <SectionTitle sub="มุมขึ้น + สปิน">Launch &amp; spin</SectionTitle>
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
            hint="+R / −L — ทิศโค้งของลูก"
          />
          <StatCard
            label="Spin axis"
            value={Number.isFinite(agg.spinAxis.mean) ? lr(agg.spinAxis.mean, 1) : "—"}
            unit="°"
            hint="แกนสปินเอียง +R / −L — ทิศโค้งของลูก"
          />
          <StatCard
            label="Apex"
            value={Number.isFinite(agg.apex.mean) ? fmt1(agg.apex.mean) : "—"}
            unit="m"
            max={Number.isFinite(agg.apex.max) ? fmt1(agg.apex.max) : undefined}
            hint="ความสูงสูงสุดของลูก"
          />
        </div>
      </div>

      {/* 5 — Speed */}
      <div>
        <SectionTitle sub="ความเร็ว">Speed</SectionTitle>
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
          <SectionTitle sub="Each dot is one shot; ellipse = ±1σ group">
            Shot pattern
          </SectionTitle>
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
              Trend range
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
            <SectionTitle sub={`Average carry per session · last ${range} mo (${d})`}>
              Carry trend
            </SectionTitle>
            <TrendChart
              series={carrySeries}
              unit={d}
              yLabel="Carry"
              empty="Not enough data in this range."
            />
          </Card>
          <Card className="p-5">
            <SectionTitle sub="Shot-to-shot carry spread per session">
              Consistency trend
            </SectionTitle>
            <TrendChart
              series={consSeries}
              unit={d}
              yLabel="Carry σ"
              lowerBetter
              empty="Not enough data in this range."
            />
          </Card>
          <Card className="p-5">
            <SectionTitle sub="+ ขวา · − ซ้าย (เทียบเส้น 0) — พลาดทางไหนบ่อยกว่า">
              Side bias trend
            </SectionTitle>
            <TrendChart
              series={sideSeries}
              unit={d}
              yLabel="Side (+R / −L)"
              target={0}
              empty="Not enough data in this range."
            />
          </Card>
        </div>
        )}
      </div>

      <Card className="p-5">
        <SectionTitle sub={`Quick, data-driven pointers for your ${activeClub}`}>
          What to work on
        </SectionTitle>
        {carryPts.length >= 2 ? (
          <p className="mb-3 text-sm text-ink-muted">
            Last {range} mo · {carryPts.length} sessions: carry{" "}
            <b className="text-ink">
              {carrySlope >= 0 ? "+" : ""}
              {carrySlope.toFixed(1)} {d}/session
            </b>
            , dispersion{" "}
            <b className={consSlope <= 0 ? "text-good" : "text-bad"}>
              {consSlope <= 0 ? "tightening ↘" : "widening ↗"}
            </b>
            .
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden
              />
              <span>
                <span className="text-ink">{t.text}</span>
                <span className="mt-1 block text-ink-muted">{t.th}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
