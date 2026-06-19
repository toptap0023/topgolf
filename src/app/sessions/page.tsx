import Link from "next/link";
import type { Shot } from "@/lib/types";
import { getSessions, getAllShots } from "@/lib/data";
import { statOf } from "@/lib/stats";
import { fmt, formatDate, distanceUnitLabel } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { ListIcon, UploadIcon, ChevronRightIcon } from "@/components/icons";

export const revalidate = 60;

export default async function SessionsPage() {
  const [sessions, shots] = await Promise.all([getSessions(), getAllShots()]);

  if (sessions.length === 0)
    return (
      <EmptyState
        icon={<ListIcon className="h-7 w-7" />}
        title="No sessions yet"
        message="Import a Garmin range CSV and each upload becomes a session you can review here."
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

  const byId = new Map<string, Shot[]>();
  for (const s of shots) {
    const g = byId.get(s.session_id);
    if (g) g.push(s);
    else byId.set(s.session_id, [s]);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">Sessions</h1>
      <div className="flex flex-col gap-3">
        {sessions.map((ses) => {
          const gs = byId.get(ses.id) ?? [];
          const carry = statOf(gs.map((g) => g.carry_distance));
          const clubs = new Set(gs.map((g) => g.club)).size;
          const d = distanceUnitLabel(ses.distance_unit);
          return (
            <Link key={ses.id} href={`/sessions/${ses.id}`} className="group">
              <Card className="flex items-center gap-4 p-4 transition-colors duration-200 group-hover:border-accent/40">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {ses.title || "Range session"}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatDate(ses.played_on)}
                    {ses.location ? ` · ${ses.location}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span className="tnum">{gs.length} shots</span>
                    <span className="tnum">{clubs} clubs</span>
                    {carry.n ? (
                      <span className="tnum">
                        avg carry {fmt(carry.mean)} {d}
                      </span>
                    ) : null}
                    {carry.n ? (
                      <span className="tnum">
                        longest {fmt(carry.max)} {d}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-muted" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
