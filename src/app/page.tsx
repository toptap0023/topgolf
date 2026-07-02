import { getAllShots, getRounds, getSessions } from "@/lib/data";
import {
  aggregateByClub,
  overallKpis,
  scoringSummary,
  carryBands,
} from "@/lib/stats";
import { DashboardClient } from "@/components/DashboardClient";

export const revalidate = 60;

export default async function DashboardPage() {
  const [shots, rounds, sessions] = await Promise.all([
    getAllShots(),
    getRounds(),
    getSessions(),
  ]);

  const scores = rounds.filter((r) => r.score != null).map((r) => r.score as number);
  const best = scores.length ? Math.min(...scores) : null;
  const { hcp, avgScore, avgPutts, avgFairways, avgGir, ideal: scoreIdeal } =
    scoringSummary(rounds);

  return (
    <DashboardClient
      empty={shots.length === 0 && rounds.length === 0}
      kpis={overallKpis(shots)}
      aggs={aggregateByClub(shots)}
      bands={carryBands(shots)}
      rounds={rounds}
      sessionsCount={sessions.length}
      lastPlayed={sessions[0]?.played_on ?? null}
      hcp={hcp}
      avgScore={avgScore}
      avgPutts={avgPutts}
      avgFairways={avgFairways}
      avgGir={avgGir}
      scoreIdeal={scoreIdeal}
      best={best}
      distanceUnit={sessions[0]?.distance_unit ?? "yds"}
      speedUnit={sessions[0]?.speed_unit ?? "mph"}
    />
  );
}
