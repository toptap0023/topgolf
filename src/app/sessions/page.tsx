import type { Shot } from "@/lib/types";
import { getSessions, getAllShots } from "@/lib/data";
import { statOf } from "@/lib/stats";
import { SessionsListClient } from "@/components/SessionsListClient";


export default async function SessionsPage() {
  const [sessions, shots] = await Promise.all([getSessions(), getAllShots()]);

  const byId = new Map<string, Shot[]>();
  for (const s of shots) {
    const g = byId.get(s.session_id);
    if (g) g.push(s);
    else byId.set(s.session_id, [s]);
  }

  const items = sessions.map((ses) => {
    const gs = byId.get(ses.id) ?? [];
    const carry = statOf(gs.map((g) => g.carry_distance));
    return {
      id: ses.id,
      title: ses.title,
      played_on: ses.played_on,
      location: ses.location,
      distance_unit: ses.distance_unit,
      shots: gs.length,
      clubs: new Set(gs.map((g) => g.club)).size,
      avgCarry: carry.n ? carry.mean : null,
      longest: carry.n ? carry.max : null,
    };
  });

  return <SessionsListClient items={items} />;
}
