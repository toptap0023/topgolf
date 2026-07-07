import { getAllShots, getRounds, getSessions } from "@/lib/data";
import {
  aggregateByClub,
  overallKpis,
  scoringSummary,
  carryBands,
} from "@/lib/stats";
import { buildCoachPrompt } from "@/lib/csv";
import { DashboardClient } from "@/components/DashboardClient";


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

  const kpis = overallKpis(shots);
  const aggs = aggregateByClub(shots);
  const distanceUnit = sessions[0]?.distance_unit ?? "yds";
  const speedUnit = sessions[0]?.speed_unit ?? "mph";
  const coachPrompt = buildCoachPrompt({
    aggs,
    kpis,
    rounds,
    distanceUnit,
    speedUnit,
    currentScore: rounds.find((r) => r.score != null)?.score ?? null,
    targetScore: 85,
  });

  return (
    <DashboardClient
      empty={shots.length === 0 && rounds.length === 0}
      kpis={kpis}
      aggs={aggs}
      coachPrompt={coachPrompt}
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
      distanceUnit={distanceUnit}
      speedUnit={speedUnit}
    />
  );
}
