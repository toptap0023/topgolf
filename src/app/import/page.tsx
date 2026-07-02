import { PageHeader } from "@/components/PageHeader";
import { ImportClient } from "@/components/ImportClient";

export const metadata = { title: "Import · TOPgolfer" };

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader page="import" />
      <ImportClient />
    </div>
  );
}
