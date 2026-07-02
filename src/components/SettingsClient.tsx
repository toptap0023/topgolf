"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { clearAllData, revealPin } from "@/app/actions";
import { useGoal } from "@/lib/goal";
import { Card, SectionTitle } from "./ui";
import { SunIcon, MoonIcon, GearIcon, TrashIcon } from "./icons";

const THEMES = [
  { key: "dark", label: "Dark", Icon: MoonIcon },
  { key: "light", label: "Light", Icon: SunIcon },
  { key: "system", label: "System", Icon: GearIcon },
] as const;

function GoalCard() {
  const [goal, saveGoal] = useGoal();
  // Local strings so typing feels natural; commit on blur/save.
  const [start, setStart] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const s = start ?? String(goal.start);
  const t = target ?? String(goal.target);
  const sn = parseInt(s, 10);
  const tn = parseInt(t, 10);
  const valid = Number.isFinite(sn) && Number.isFinite(tn) && sn > tn && tn >= 55;
  const dirty = sn !== goal.start || tn !== goal.target;

  const input =
    "w-24 rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-center tnum text-ink focus:border-accent";

  return (
    <Card className="p-5">
      <SectionTitle sub="เส้นทางสกอร์ของคุณ — จุดเริ่มต้น → เป้าหมาย ใช้กับแถบ Goal และเส้น target ในกราฟ">
        Goal
      </SectionTitle>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-muted">Starting score</span>
          <input
            type="number"
            inputMode="numeric"
            value={s}
            onChange={(e) => setStart(e.target.value)}
            className={input}
          />
        </label>
        <span className="pb-3 text-ink-muted">→</span>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-muted">Target score</span>
          <input
            type="number"
            inputMode="numeric"
            value={t}
            onChange={(e) => setTarget(e.target.value)}
            className={input}
          />
        </label>
        <button
          type="button"
          disabled={!valid || !dirty}
          onClick={() => {
            saveGoal({ start: sn, target: tn });
            setStart(null);
            setTarget(null);
          }}
          className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
      {!valid ? (
        <p className="mt-2 text-sm text-bad" role="alert">
          Starting score must be higher than target. / สกอร์เริ่มต้นต้องมากกว่าเป้าหมาย
        </p>
      ) : null}
    </Card>
  );
}

export function SettingsClient() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRecover, setShowRecover] = useState(false);
  const [code, setCode] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <GoalCard />

      <Card className="p-5">
        <SectionTitle sub="Choose how TOPgolfer looks">Appearance</SectionTitle>
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
          เปิดสาธารณะ — ใครมีลิงก์ก็เข้าดู / อัปข้อมูลได้ ไม่มีหน้า login. มีแค่
          การ <b className="text-ink">ลบข้อมูลทั้งหมด</b> ด้านล่างเท่านั้นที่ต้องใส่
          PIN เพื่อกันลบโดยไม่ตั้งใจ.
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

            {revealed ? (
              <p className="text-sm text-ink-muted">
                PIN ของคุณคือ{" "}
                <b className="tnum tracking-widest text-accent">{revealed}</b>
              </p>
            ) : showRecover ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="••••"
                    className="max-w-[11rem] rounded-lg border border-line bg-bg-panel px-3 py-1.5 text-center text-sm tracking-[0.2em] text-ink focus:border-accent"
                  />
                  <button
                    type="button"
                    disabled={pending || !code.trim()}
                    onClick={() =>
                      start(async () => {
                        const r = await revealPin(code);
                        if (r.error) {
                          setError(r.error);
                          return;
                        }
                        setError(null);
                        setRevealed(r.pin ?? null);
                      })
                    }
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:text-accent disabled:opacity-50 cursor-pointer"
                  >
                    ดู PIN
                  </button>
                </div>
                <span className="text-[11px] text-ink-muted">
                  รหัสกู้คืน = วันเกิด + เดือนเกิด (เช่น 23 ต.ค. → 2310)
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowRecover(true);
                  setError(null);
                }}
                className="self-start text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer"
              >
                ลืม PIN?
              </button>
            )}

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
                  setShowRecover(false);
                  setCode("");
                  setRevealed(null);
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
