import Link from "next/link";
import { getAllShots, getRounds, getSessions } from "@/lib/data";
import {
  aggregateByClub,
  overallKpis,
  scoringSummary,
  carryBands,
} from "@/lib/stats";
import { CaddyCard } from "@/components/CaddyCard";
import { ScoringZone } from "@/components/ScoringZone";
import {
  fmt,
  fmt1,
  fmt2,
  formatDate,
  distanceUnitLabel,
  speedUnitLabel,
} from "@/lib/format";
import { Card, SectionTitle, StatCard, EmptyState } from "@/components/ui";
import { GoalProgress } from "@/components/GoalProgress";
import { GapMonitor } from "@/components/GapMonitor";
import { ClubTable } from "@/components/ClubTable";
import { UploadIcon, FlagIcon, ChevronRightIcon } from "@/components/icons";

export const revalidate = 60;

export default async function DashboardPage() {
  const [shots, rounds, sessions] = await Promise.all([
    getAllShots(),
    getRounds(),
    getSessions(),
  ]);

  const distanceUnit = sessions[0]?.distance_unit ?? "yds";
  const speedUnit = sessions[0]?.speed_unit ?? "mph";
  const d = distanceUnitLabel(distanceUnit);
  const sp = speedUnitLabel(speedUnit);

  if (shots.length === 0 && rounds.length === 0) {
    return (
      <EmptyState
        icon={<FlagIcon className="h-7 w-7" />}
        title="Welcome to TOPgolfer"
        message={
          <>
            Import a CSV exported from the Garmin Golf app (your Approach R10
            range sessions) to see your distances, dispersion, and trends —
            then track your way from 105 to 85.
            <span className="mt-1 block">
              อัปโหลด CSV จากแอป Garmin Golf เพื่อดูระยะ ความแม่น และพัฒนาการ
              — ไล่สกอร์จาก 105 สู่ 85
            </span>
          </>
        }
        action={
          <Link
            href="/import"
            className="mt-1 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
          >
            <UploadIcon className="h-5 w-5" />
            Import Garmin CSV
          </Link>
        }
      />
    );
  }

  const aggs = aggregateByClub(shots);
  const bands = carryBands(shots);
  const kpis = overallKpis(shots);
  const scores = rounds.filter((r) => r.score != null).map((r) => r.score as number);
  const best = scores.length ? Math.min(...scores) : null;
  const { hcp, avgScore, avgPutts, avgFairways, avgGir, ideal: scoreIdeal } =
    scoringSummary(rounds);

  const lastPlayed = sessions[0]?.played_on;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
            {lastPlayed ? ` · last played ${formatDate(lastPlayed)}` : ""}
          </p>
        </div>
        <Link
          href="/import"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
        >
          <UploadIcon className="h-4 w-4" />
          Import
        </Link>
      </div>

      <GoalProgress
        current={avgScore != null ? Math.round(avgScore) : null}
        best={best}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Handicap (est.)"
          value={hcp != null ? fmt1(hcp) : "—"}
          hint={hcp != null ? "ประมาณจาก score − par" : "ต้องมี ≥ 3 รอบ"}
        />
        <StatCard
          label="Avg putts"
          value={avgPutts != null ? fmt1(avgPutts) : "—"}
          ideal={String(scoreIdeal.putts)}
        />
        <StatCard
          label="Fairways"
          value={avgFairways != null ? fmt1(avgFairways) : "—"}
          unit="/14"
          ideal={`${scoreIdeal.fairways}/14`}
        />
        <StatCard
          label="GIR"
          value={avgGir != null ? fmt1(avgGir) : "—"}
          unit="/18"
          ideal={`${scoreIdeal.gir}/18`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Shots logged" value={fmt(kpis.shots)} />
        <StatCard label="Clubs hit" value={fmt(kpis.clubs)} />
        <StatCard
          label="Longest carry"
          value={kpis.longestCarry ? fmt(kpis.longestCarry.value) : "—"}
          unit={d}
          hint={kpis.longestCarry?.club}
        />
        <StatCard
          label="Avg smash"
          value={Number.isFinite(kpis.avgSmash) ? fmt2(kpis.avgSmash) : "—"}
          hint="ball ÷ club speed"
        />
      </div>

      <CaddyCard aggs={aggs} distanceUnit={distanceUnit} />

      <Card className="p-5">
        <SectionTitle>Distance gapping</SectionTitle>
        <GapMonitor aggs={aggs} />
      </Card>

      <ScoringZone bands={bands} distanceUnit={distanceUnit} />

      {scores.length ? (
        <Card className="p-5">
          <SectionTitle
            sub="Most recent rounds"
            right={
              <Link
                href="/rounds"
                className="flex items-center gap-0.5 text-sm font-medium text-accent hover:underline"
              >
                All rounds <ChevronRightIcon className="h-4 w-4" />
              </Link>
            }
          >
            Scores
          </SectionTitle>
          <ul className="flex flex-col divide-y divide-line">
            {rounds
              .filter((r) => r.score != null)
              .slice(0, 6)
              .map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="text-ink-muted">
                    {formatDate(r.played_on)}
                    {r.course ? ` · ${r.course}` : ""}
                  </span>
                  <span className="tnum text-lg font-bold text-ink">
                    {r.score}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-5">
        <SectionTitle sub={`Speeds in ${sp}, distances in ${d}`}>
          Club averages
        </SectionTitle>
        <ClubTable aggs={aggs} distanceUnit={distanceUnit} speedUnit={speedUnit} />
      </Card>
    </div>
  );
}
