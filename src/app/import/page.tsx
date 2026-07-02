import { ImportClient } from "@/components/ImportClient";

export const metadata = { title: "Import · TOPgolfer" };

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">Import</h1>
      <ImportClient />
    </div>
  );
}
