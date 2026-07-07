import { PageHeader } from "@/components/PageHeader";
import { getRounds } from "@/lib/data";
import { RoundsClient } from "@/components/RoundsClient";
import { RoundsImport } from "@/components/RoundsImport";

export const metadata = { title: "Rounds · TOPgolfer" };

export default async function RoundsPage() {
  const rounds = await getRounds();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader page="rounds" />
      <RoundsImport />
      <RoundsClient rounds={rounds} />
    </div>
  );
}
