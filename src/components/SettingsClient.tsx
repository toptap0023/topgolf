"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { clearAllData } from "@/app/actions";
import { Card, SectionTitle } from "./ui";
import { SunIcon, MoonIcon, GearIcon, TrashIcon } from "./icons";

const THEMES = [
  { key: "dark", label: "Dark", Icon: MoonIcon },
  { key: "light", label: "Light", Icon: SunIcon },
  { key: "system", label: "System", Icon: GearIcon },
] as const;

export function SettingsClient() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <SectionTitle sub="Choose how TOPgolf looks">Appearance</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ key, label, Icon }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Privacy</SectionTitle>
        <p className="text-sm text-ink-muted">
          This app has no login. Anyone who has the URL can view, import, and
          delete your golf data. Keep the link private, or ask to add a simple
          password later.
        </p>
      </Card>

      <Card className="border-bad/30 p-5">
        <SectionTitle sub="Permanently delete all sessions, shots, and rounds. This cannot be undone.">
          Danger zone
        </SectionTitle>
        {error ? <p className="mb-2 text-sm text-bad">{error}</p> : null}
        {confirm ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="clearpin"
                className="text-sm font-medium text-ink-muted"
              >
                ใส่ PIN เพื่อยืนยันการลบทั้งหมด
              </label>
              <input
                id="clearpin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="max-w-[12rem] rounded-xl border border-line bg-bg-panel px-4 py-2.5 text-center tracking-[0.3em] text-ink focus:border-bad"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending || !pin.trim()}
                onClick={() =>
                  start(async () => {
                    const res = await clearAllData(pin);
                    if (res.error) {
                      setError(res.error);
                      return;
                    }
                    setConfirm(false);
                    setPin("");
                    router.refresh();
                  })
                }
                className="flex items-center gap-2 rounded-xl bg-bad px-5 py-2.5 font-semibold text-white disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-4 w-4" />
                {pending ? "Deleting…" : "Yes, delete everything"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirm(false);
                  setPin("");
                  setError(null);
                }}
                className="text-sm text-ink-muted hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="flex items-center gap-2 rounded-xl border border-bad/40 px-5 py-2.5 text-sm font-semibold text-bad transition-colors duration-200 hover:bg-bad/10 cursor-pointer"
          >
            <TrashIcon className="h-4 w-4" />
            Clear all data
          </button>
        )}
      </Card>
    </div>
  );
}
