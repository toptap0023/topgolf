import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { getAllShots, getSessions, getRounds } from "@/lib/data";
import { aggregateByClub, overallKpis } from "@/lib/stats";
import { shotsToCsv, clubTableCsv, roundsToCsv, buildCoachPrompt } from "@/lib/csv";
import type { GolfSession } from "@/lib/types";
import { ExportClient } from "@/components/ExportClient";
import { EmptyState } from "@/components/ui";
import { UploadIcon, DownloadIcon } from "@/components/icons";

export const revalidate = 60;
export const metadata = { title: "Export · TOPgolfer" };

export default async function ExportPage() {
  const [shots, sessions, rounds] = await Promise.all([
    getAllShots(),
    getSessions(),
    getRounds(),
  ]);

  if (shots.length === 0 && rounds.length === 0)
    return (
      <EmptyState
        icon={<UploadIcon className="h-7 w-7" />}
        title="Nothing to export yet"
        message="Import some range data first, then come back to download CSVs or grab an AI coaching prompt."
        action={
          <Link
            href="/import"
            className="mt-1 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
          >
            <DownloadIcon className="h-5 w-5" />
            Import Garmin CSV
          </Link>
        }
      />
    );

  const byId: Record<string, GolfSession> = Object.fromEntries(
    sessions.map((s) => [s.id, s])
  );
  const aggs = aggregateByClub(shots);
  const kpis = overallKpis(shots);
  const distanceUnit = sessions[0]?.distance_unit ?? "yds";
  const speedUnit = sessions[0]?.speed_unit ?? "mph";
  const current = rounds.find((r) => r.score != null)?.score ?? null;

  const allShotsCsv = shotsToCsv(shots, byId);
  const clubCsv = clubTableCsv(aggs, distanceUnit, speedUnit);
  const roundsCsv = roundsToCsv(rounds);
  const coachPrompt = buildCoachPrompt({
    aggs,
    kpis,
    rounds,
    distanceUnit,
    speedUnit,
    currentScore: current,
    targetScore: 85,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader page="export" />
      <ExportClient
        allShotsCsv={allShotsCsv}
        clubCsv={clubCsv}
        roundsCsv={roundsCsv}
        coachPrompt={coachPrompt}
        shotCount={shots.length}
        roundCount={rounds.length}
      />
    </div>
  );
}
