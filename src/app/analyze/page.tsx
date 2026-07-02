import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { getSessionShots, getSessions } from "@/lib/data";
import type { Shot } from "@/lib/types";
import { AnalyzeClient } from "@/components/AnalyzeClient";
import { EmptyState } from "@/components/ui";
import { TargetIcon, UploadIcon } from "@/components/icons";

export const revalidate = 60;

export default async function AnalyzePage() {
  const [sessionShots, sessions] = await Promise.all([
    getSessionShots(),
    getSessions(),
  ]);

  const hasShots = sessionShots.some((s) => s.shots.length > 0);
  if (!hasShots)
    return (
      <EmptyState
        icon={<TargetIcon className="h-7 w-7" />}
        title="Nothing to analyze yet"
        message="Import some range sessions and you'll get per-club dispersion plots, carry trends, and consistency tracking here."
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

  // Strip the heavy raw jsonb before serializing to the client component.
  const lite = sessionShots.map((s) => ({
    ...s,
    shots: s.shots.map(({ raw, ...rest }) => rest as Shot),
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader page="analyze" />
      <AnalyzeClient
        sessionShots={lite}
        distanceUnit={sessions[0]?.distance_unit ?? "yds"}
        speedUnit={sessions[0]?.speed_unit ?? "mph"}
      />
    </div>
  );
}
