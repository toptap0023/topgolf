"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { clearAllData, revealPin } from "@/app/actions";
import { useGoal } from "@/lib/goal";
import { useT, useLang, type Dict } from "@/lib/i18n";
import { Card, SectionTitle } from "./ui";
import { SunIcon, MoonIcon, GearIcon, TrashIcon } from "./icons";

const L = {
  goal: { en: "Goal", th: "เป้าหมาย" },
  goalSub: {
    en: "Your score journey · start → target. Drives the Goal bar and the target line in charts.",
    th: "เส้นทางสกอร์ของคุณ · จุดเริ่มต้น → เป้าหมาย ใช้กับแถบ Goal และเส้น target ในกราฟ",
  },
  startScore: { en: "Starting score", th: "สกอร์เริ่มต้น" },
  targetScore: { en: "Target score", th: "สกอร์เป้าหมาย" },
  save: { en: "Save", th: "บันทึก" },
  goalInvalid: {
    en: "Starting score must be higher than target.",
    th: "สกอร์เริ่มต้นต้องมากกว่าเป้าหมาย",
  },
  appearance: { en: "Appearance", th: "การแสดงผล" },
  appearanceSub: {
    en: "Choose how TOPgolfer looks",
    th: "เลือกหน้าตาของ TOPgolfer",
  },
  dark: { en: "Dark", th: "มืด" },
  light: { en: "Light", th: "สว่าง" },
  system: { en: "System", th: "ตามระบบ" },
  privacy: { en: "Privacy", th: "ความเป็นส่วนตัว" },
  privacyBody1: {
    en: "Public by design · anyone with the link can view or upload data. No login page. Only ",
    th: "เปิดสาธารณะ · ใครมีลิงก์ก็เข้าดู / อัปข้อมูลได้ ไม่มีหน้า login. มีแค่การ ",
  },
  privacyBodyBold: {
    en: "Clear all data",
    th: "ลบข้อมูลทั้งหมด",
  },
  privacyBody2: {
    en: " below requires a PIN, to prevent accidental deletion.",
    th: " ด้านล่างเท่านั้นที่ต้องใส่ PIN เพื่อกันลบโดยไม่ตั้งใจ.",
  },
  dangerZone: { en: "Danger zone", th: "โซนอันตราย" },
  dangerSub: {
    en: "Permanently delete all sessions, shots, and rounds. This cannot be undone.",
    th: "ลบเซสชัน ช็อต และรอบทั้งหมดอย่างถาวร ย้อนกลับไม่ได้",
  },
  pinLabel: {
    en: "Enter PIN to confirm deleting everything",
    th: "ใส่ PIN เพื่อยืนยันการลบทั้งหมด",
  },
  forgotPin: { en: "Forgot PIN?", th: "ลืม PIN?" },
  viewPin: { en: "View PIN", th: "ดู PIN" },
  yourPinIs: { en: "Your PIN is", th: "PIN ของคุณคือ" },
  recoveryHint: {
    en: "Recovery code = birth day + birth month (e.g. 23 Oct → 2310)",
    th: "รหัสกู้คืน = วันเกิด + เดือนเกิด (เช่น 23 ต.ค. → 2310)",
  },
  deleteYes: { en: "Yes, delete everything", th: "ใช่ ลบทั้งหมด" },
  deleting: { en: "Deleting…", th: "กำลังลบ…" },
  cancel: { en: "Cancel", th: "ยกเลิก" },
  clearAll: { en: "Clear all data", th: "ลบข้อมูลทั้งหมด" },
} satisfies Dict;

const THEMES = [
  { key: "dark", Icon: MoonIcon },
  { key: "light", Icon: SunIcon },
  { key: "system", Icon: GearIcon },
] as const;

const LANGS = [
  { key: "en", label: "English" },
  { key: "th", label: "ไทย" },
] as const;

function GoalCard() {
  const t = useT(L);
  const [goal, saveGoal] = useGoal();
  // Local strings so typing feels natural; commit on blur/save.
  const [start, setStart] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const s = start ?? String(goal.start);
  const tv = target ?? String(goal.target);
  const sn = parseInt(s, 10);
  const tn = parseInt(tv, 10);
  const valid = Number.isFinite(sn) && Number.isFinite(tn) && sn > tn && tn >= 55;
  const dirty = sn !== goal.start || tn !== goal.target;

  const input =
    "w-24 rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-center tnum text-ink focus:border-accent";

  return (
    <Card className="p-5">
      <SectionTitle sub={t("goalSub")}>{t("goal")}</SectionTitle>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-muted">{t("startScore")}</span>
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
          <span className="font-medium text-ink-muted">{t("targetScore")}</span>
          <input
            type="number"
            inputMode="numeric"
            value={tv}
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
          {t("save")}
        </button>
      </div>
      {!valid ? (
        <p className="mt-2 text-sm text-bad" role="alert">
          {t("goalInvalid")}
        </p>
      ) : null}
    </Card>
  );
}

export function SettingsClient() {
  const router = useRouter();
  const t = useT(L);
  const { lang, setLang } = useLang();
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
      <Card className="p-5">
        <SectionTitle>Language / ภาษา</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map(({ key, label }) => {
            const active = lang === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setLang(key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      <GoalCard />

      <Card className="p-5">
        <SectionTitle sub={t("appearanceSub")}>{t("appearance")}</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ key, Icon }) => {
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
                {t(key)}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>{t("privacy")}</SectionTitle>
        <p className="text-sm text-ink-muted">
          {t("privacyBody1")}
          <b className="text-ink">{t("privacyBodyBold")}</b>
          {t("privacyBody2")}
        </p>
      </Card>

      <Card className="border-bad/30 p-5">
        <SectionTitle sub={t("dangerSub")}>{t("dangerZone")}</SectionTitle>
        {error ? <p className="mb-2 text-sm text-bad">{error}</p> : null}
        {confirm ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="clearpin"
                className="text-sm font-medium text-ink-muted"
              >
                {t("pinLabel")}
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
                {t("yourPinIs")}{" "}
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
                    {t("viewPin")}
                  </button>
                </div>
                <span className="text-[11px] text-ink-muted">
                  {t("recoveryHint")}
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
                {t("forgotPin")}
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
                {pending ? t("deleting") : t("deleteYes")}
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
                {t("cancel")}
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
            {t("clearAll")}
          </button>
        )}
      </Card>
    </div>
  );
}
