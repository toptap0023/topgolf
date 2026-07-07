"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT, type Dict } from "@/lib/i18n";

const L = {
  title: { en: "Set a new password", th: "ตั้งรหัสผ่านใหม่" },
  subtitle: {
    en: "Choose a new password for your TOPgolfer account",
    th: "ตั้งรหัสผ่านใหม่สำหรับบัญชี TOPgolfer ของคุณ",
  },
  newPassword: { en: "New password", th: "รหัสผ่านใหม่" },
  confirmPassword: { en: "Confirm new password", th: "ยืนยันรหัสผ่านใหม่" },
  placeholder: { en: "At least 8 characters", th: "อย่างน้อย 8 ตัวอักษร" },
  submit: { en: "Update password", th: "อัปเดตรหัสผ่าน" },
  submitting: { en: "Updating…", th: "กำลังอัปเดต…" },
  tooShort: {
    en: "Password must be at least 8 characters",
    th: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  },
  mismatch: { en: "Passwords do not match", th: "รหัสผ่านไม่ตรงกัน" },
  genericError: {
    en: "Could not update password · please try again",
    th: "อัปเดตรหัสผ่านไม่สำเร็จ · กรุณาลองอีกครั้ง",
  },
  successTitle: { en: "Password updated", th: "อัปเดตรหัสผ่านแล้ว" },
  successBody: {
    en: "Your password has been changed. You can now use the app.",
    th: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว เริ่มใช้งานแอปได้เลย",
  },
  goToApp: { en: "Go to app", th: "เข้าแอป" },
  expiredTitle: { en: "Link expired or invalid", th: "ลิงก์หมดอายุหรือไม่ถูกต้อง" },
  expiredBody: {
    en: "Open the reset link from your email again",
    th: "กรุณาเปิดลิงก์รีเซ็ตรหัสผ่านจากอีเมลของคุณอีกครั้ง",
  },
  backToLogin: { en: "Back to sign in", th: "กลับไปหน้าเข้าสู่ระบบ" },
  checking: { en: "Checking your link…", th: "กำลังตรวจสอบลิงก์…" },
} satisfies Dict;

const inputCls =
  "rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink placeholder:text-ink-muted/50 focus:border-accent";
const buttonCls =
  "rounded-xl bg-accent px-5 py-2.5 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed";

export default function ResetPasswordClient() {
  const t = useT(L);
  const [checking, setChecking] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<keyof typeof L | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setHasUser(!!data.user);
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("tooShort");
      return;
    }
    if (password !== confirm) {
      setError("mismatch");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (err) {
      setError("genericError");
      return;
    }
    setDone(true);
  }

  if (checking) {
    return (
      <p className="mt-8 text-center text-sm text-ink-muted">{t("checking")}</p>
    );
  }

  if (!hasUser) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-bg-panel p-6 text-center">
        <h1 className="text-lg font-semibold text-ink">{t("expiredTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("expiredBody")}</p>
        <a
          href="/login"
          className="mt-4 inline-block min-h-11 py-2.5 font-medium text-accent underline underline-offset-4 hover:text-accent-dark"
        >
          {t("backToLogin")}
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-bg-panel p-6 text-center">
        <h1 className="text-lg font-semibold text-good">{t("successTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("successBody")}</p>
        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className={`mt-5 ${buttonCls}`}
        >
          {t("goToApp")}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h1 className="text-center text-lg font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-1 text-center text-sm text-ink-muted">{t("subtitle")}</p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">
            {t("newPassword")}
          </span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("placeholder")}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">
            {t("confirmPassword")}
          </span>
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("placeholder")}
            className={inputCls}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-bad">
            {t(error)}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={buttonCls}>
          {pending ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
