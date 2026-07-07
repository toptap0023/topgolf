import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { getAllShots, getSessions, getRounds } from "@/lib/data";
import { ExportClient } from "@/components/ExportClient";
import { EmptyState } from "@/components/ui";
import { UploadIcon, DownloadIcon } from "@/components/icons";

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

  // Client filters/rebuilds CSVs + prompt per selected day, so hand it the raw data.
  return (
    <div className="flex flex-col gap-4">
      <PageHeader page="export" />
      <ExportClient shots={shots} sessions={sessions} rounds={rounds} />
    </div>
  );
}
