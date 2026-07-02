import { PageHeader } from "@/components/PageHeader";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata = { title: "Settings · TOPgolfer" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader page="settings" />
      <SettingsClient />
    </div>
  );
}
