"use client";

import Link from "next/link";
import type { ClubAgg, Kpis, CarryBand } from "@/lib/stats";
import type { DistanceUnit, SpeedUnit, GolfRound } from "@/lib/types";
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
import { useT, type Dict } from "@/lib/i18n";

const L = {
  welcomeTitle: { en: "Welcome to TOPgolfer", th: "ยินดีต้อนรับสู่ TOPgolfer" },
  welcomeMsg: {
    en: "Import a CSV exported from the Garmin Golf app (your Approach R10 range sessions) to see your distances, dispersion, and trends — then track your way from 105 to 85.",
    th: "อัปโหลด CSV จากแอป Garmin Golf เพื่อดูระยะ ความแม่น และพัฒนาการ — ไล่สกอร์จาก 105 สู่ 85",
  },
  importCsv: { en: "Import Garmin CSV", th: "อัปโหลด Garmin CSV" },
  dashboard: { en: "Dashboard", th: "แดชบอร์ด" },
  importBtn: { en: "Import", th: "อัปโหลด" },
  session: { en: "session", th: "เซสชัน" },
  sessions: { en: "sessions", th: "เซสชัน" },
  lastPlayed: { en: "last played", th: "เล่นล่าสุด" },
  handicap: { en: "Handicap (est.)", th: "แฮนดิแคป (ประมาณ)" },
  hcpHint: { en: "estimated from score − par", th: "ประมาณจาก score − par" },
  hcpNeed: { en: "needs ≥ 3 rounds", th: "ต้องมี ≥ 3 รอบ" },
  avgPutts: { en: "Avg putts", th: "Putts เฉลี่ย" },
  shotsLogged: { en: "Shots logged", th: "จำนวนช็อต" },
  clubsHit: { en: "Clubs hit", th: "ไม้ที่ใช้" },
  longestCarry: { en: "Longest carry", th: "Carry ไกลสุด" },
  avgSmash: { en: "Avg smash", th: "Smash เฉลี่ย" },
  distanceGapping: { en: "Distance gapping", th: "ระยะห่างระหว่างไม้" },
  scores: { en: "Scores", th: "สกอร์" },
  recentRounds: { en: "Most recent rounds", th: "รอบล่าสุด" },
  allRounds: { en: "All rounds", th: "รอบทั้งหมด" },
  clubAverages: { en: "Club averages", th: "ค่าเฉลี่ยแต่ละไม้" },
  speedsIn: { en: "Speeds in", th: "ความเร็วเป็น" },
  distancesIn: { en: "distances in", th: "ระยะเป็น" },
} satisfies Dict;

export function DashboardClient({
  empty,
  kpis,
  aggs,
  bands,
  rounds,
  sessionsCount,
  lastPlayed,
  hcp,
  avgScore,
  avgPutts,
  avgFairways,
  avgGir,
  scoreIdeal,
  best,
  distanceUnit,
  speedUnit,
}: {
  empty: boolean;
  kpis: Kpis;
  aggs: ClubAgg[];
  bands: CarryBand[];
  rounds: GolfRound[];
  sessionsCount: number;
  lastPlayed: string | null;
  hcp: number | null;
  avgScore: number | null;
  avgPutts: number | null;
  avgFairways: number | null;
  avgGir: number | null;
  scoreIdeal: { putts: number; fairways: number; gir: number };
  best: number | null;
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
}) {
  const t = useT(L);
  const d = distanceUnitLabel(distanceUnit);
  const sp = speedUnitLabel(speedUnit);
  const scores = rounds.filter((r) => r.score != null);

  if (empty) {
    return (
      <EmptyState
        icon={<FlagIcon className="h-7 w-7" />}
        title={t("welcomeTitle")}
        message={t("welcomeMsg")}
        action={
          <Link
            href="/import"
            className="mt-1 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
          >
            <UploadIcon className="h-5 w-5" />
            {t("importCsv")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t("dashboard")}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {sessionsCount} {sessionsCount === 1 ? t("session") : t("sessions")}
            {lastPlayed ? ` · ${t("lastPlayed")} ${formatDate(lastPlayed)}` : ""}
          </p>
        </div>
        <Link
          href="/import"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
        >
          <UploadIcon className="h-4 w-4" />
          {t("importBtn")}
        </Link>
      </div>

      <GoalProgress
        current={avgScore != null ? Math.round(avgScore) : null}
        best={best}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("handicap")}
          value={hcp != null ? fmt1(hcp) : "—"}
          hint={hcp != null ? t("hcpHint") : t("hcpNeed")}
        />
        <StatCard
          label={t("avgPutts")}
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
        <StatCard label={t("shotsLogged")} value={fmt(kpis.shots)} />
        <StatCard label={t("clubsHit")} value={fmt(kpis.clubs)} />
        <StatCard
          label={t("longestCarry")}
          value={kpis.longestCarry ? fmt(kpis.longestCarry.value) : "—"}
          unit={d}
          hint={kpis.longestCarry?.club}
        />
        <StatCard
          label={t("avgSmash")}
          value={Number.isFinite(kpis.avgSmash) ? fmt2(kpis.avgSmash) : "—"}
          hint="ball ÷ club speed"
        />
      </div>

      <CaddyCard aggs={aggs} distanceUnit={distanceUnit} />

      <Card className="p-5">
        <SectionTitle>{t("distanceGapping")}</SectionTitle>
        <GapMonitor aggs={aggs} />
      </Card>

      <ScoringZone bands={bands} distanceUnit={distanceUnit} />

      {scores.length ? (
        <Card className="p-5">
          <SectionTitle
            sub={t("recentRounds")}
            right={
              <Link
                href="/rounds"
                className="flex items-center gap-0.5 text-sm font-medium text-accent hover:underline"
              >
                {t("allRounds")} <ChevronRightIcon className="h-4 w-4" />
              </Link>
            }
          >
            {t("scores")}
          </SectionTitle>
          <ul className="flex flex-col divide-y divide-line">
            {scores.slice(0, 6).map((r) => (
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
        <SectionTitle sub={`${t("speedsIn")} ${sp}, ${t("distancesIn")} ${d}`}>
          {t("clubAverages")}
        </SectionTitle>
        <ClubTable aggs={aggs} distanceUnit={distanceUnit} speedUnit={speedUnit} />
      </Card>
    </div>
  );
}
