import { notFound } from "next/navigation";
import { getSession, getShotsForSession } from "@/lib/data";
import {
  aggregateByClub,
  overallKpis,
  dispersionFor,
  fatigueCurve,
  swingVerdict,
} from "@/lib/stats";
import type { Shot } from "@/lib/types";
import { SessionDetailClient } from "@/components/SessionDetailClient";


export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();
  const shots = await getShotsForSession(id);

  const aggs = aggregateByClub(shots);
  const topClub = [...aggs].sort((a, b) => b.count - a.count)[0] ?? null;
  const disp = dispersionFor(
    topClub ? shots.filter((s) => s.club === topClub.club) : []
  );

  // Strip the heavy raw jsonb before serializing to the client component.
  const lite = shots.map(({ raw, ...rest }) => rest as Shot);

  return (
    <SessionDetailClient
      session={session}
      shots={lite}
      aggs={aggs}
      kpis={overallKpis(shots)}
      disp={disp}
      topClub={topClub}
      fatigue={fatigueCurve(shots)}
      verdict={swingVerdict(shots)}
    />
  );
}
