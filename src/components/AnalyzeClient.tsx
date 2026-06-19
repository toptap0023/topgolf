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
const IDEAL: Record<string, { launch: string; spin: string }> = {
  Driver: { launch: "13–15°", spin: "2.4–2.8k" },
  Wood: { launch: "11–13°", spin: "3.0–3.7k" },
  Hybrid: { launch: "12–15°", spin: "3.8–4.5k" },
  Iron: { launch: "15–19°", spin: "5.5–7.5k" },
  Wedge: { launch: "28–32°", spin: "8–10k" },
};

export function AnalyzeClient({
  sessionShots,
  distanceUnit,
  speedUnit,
}: {
  sessionShots: SessionShots[];
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
}) {
  const allShots = useMemo(
    () => sessionShots.flatMap((s) => s.shots),
    [sessionShots]
  );
  const aggs = useMemo(() => aggregateByClub(allShots), [allShots]);
  const clubs = aggs.map((a) => a.club);
  const [club, setClub] = useState<string>(clubs[0] ?? "");
  const [range, setRange] = useState(12); // trend window in months

  const agg = aggs.find((a) => a.club === club);
  const clubShots = useMemo(
    () => allShots.filter((s: Shot) => s.club === club),
    [allShots, club]
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
    metricTrend(trendData, metric, club).map((p) => ({
      date: p.date,
      value: p.value,
    }));
  const carryPts = pts("carry_distance");
  const sidePts = pts("carry_deviation_distance");
  const consPts = consistencyTrend(trendData, club).map((p) => ({
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

  return (
    <div className="flex flex-col gap-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {aggs.map((a) => (
          <button
            key={a.club}
            type="button"
            onClick={() => setClub(a.club)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer ${
              a.club === club
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
        <h2 className="text-xl font-bold text-ink">{club}</h2>
        <Badge tone={shape.tone}>{shape.label}</Badge>
        <Badge tone={contact.tone}>{contact.label} contact</Badge>
        <span className="text-sm text-ink-muted">· {agg.count} shots</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Avg carry"
          value={fmt(agg.carry.mean)}
          unit={d}
          hint={`±${fmt1(agg.carry.std)} σ`}
        />
        <StatCard label="Avg total" value={fmt(agg.total.mean)} unit={d} />
        <StatCard
          label="Consistency"
          value={Number.isFinite(agg.consistency) ? fmt1(agg.consistency) : "—"}
          unit="% CV"
          hint="lower = tighter"
          ideal="< 6%"
        />
        <StatCard
          label="Side bias"
          value={lr(agg.lateral.mean)}
          unit={d}
          hint={`±${fmt1(agg.lateral.std)} spread`}
          ideal="≈ 0"
        />
        <StatCard
          label="Ball speed"
          value={fmt1(agg.ball.mean)}
          unit={sp}
        />
        <StatCard
          label="Smash"
          value={fmt2(agg.smash.mean)}
          ideal={`~${agg.smashIdeal.toFixed(2)}`}
        />
        <StatCard
          label="Launch"
          value={fmt1(agg.launch.mean)}
          unit="°"
          ideal={idl?.launch}
        />
        <StatCard
          label="Spin"
          value={fmt(agg.spin.mean)}
          unit="rpm"
          ideal={idl?.spin}
        />
        <StatCard
          label="Club path"
          value={
            Number.isFinite(agg.clubPath.mean)
              ? `${fmt1(Math.abs(agg.clubPath.mean))}°`
              : "—"
          }
          unit={
            Number.isFinite(agg.clubPath.mean)
              ? pathDir(agg.clubPath.mean)
              : undefined
          }
          ideal="≈ 0°"
        />
        <StatCard
          label="Club face"
          value={
            Number.isFinite(agg.face.mean)
              ? `${fmt1(Math.abs(agg.face.mean))}°`
              : "—"
          }
          unit={
            Number.isFinite(agg.face.mean) ? faceDir(agg.face.mean) : undefined
          }
          hint={`face-to-path ${pm(agg.faceToPath.mean)}°`}
          ideal="≈ 0°"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle sub="Each dot is one shot; ellipse = ±1σ group">
            Shot pattern
          </SectionTitle>
          <div className="mx-auto max-w-sm">
            <DispersionChart
              dispersion={disp}
              unit={d}
              club={club}
              color={color}
            />
          </div>
        </Card>

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
      </div>

      <Card className="p-5">
        <SectionTitle sub={`Quick, data-driven pointers for your ${club}`}>
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
