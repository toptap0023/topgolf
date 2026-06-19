import { SettingsClient } from "@/components/SettingsClient";

export const metadata = { title: "Settings · TOPgolf" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">Settings</h1>
      <SettingsClient />
    </div>
  );
}
