import { getRounds } from "@/lib/data";
import { RoundsClient } from "@/components/RoundsClient";
import { RoundsImport } from "@/components/RoundsImport";

export const revalidate = 60;
export const metadata = { title: "Rounds · TOPgolf" };

export default async function RoundsPage() {
  const rounds = await getRounds();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Rounds</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Log your 18-hole scores to track progress toward your goal.
        </p>
      </div>
      <RoundsImport />
      <RoundsClient rounds={rounds} />
    </div>
  );
}
