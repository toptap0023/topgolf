"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT, type Dict } from "@/lib/i18n";
import { Card } from "./ui";

const L = {
  // Titles / mode headers
  signinTitle: { en: "Sign in", th: "เข้าสู่ระบบ" },
  signupTitle: { en: "Create account", th: "สมัครสมาชิก" },
  forgotTitle: { en: "Reset password", th: "รีเซ็ตรหัสผ่าน" },
  // Labels
  email: { en: "Email", th: "อีเมล" },
  password: { en: "Password", th: "รหัสผ่าน" },
  confirmPassword: { en: "Confirm password", th: "ยืนยันรหัสผ่าน" },
  passwordHint: {
    en: "At least 8 characters",
    th: "อย่างน้อย 8 ตัวอักษร",
  },
  // Buttons
  signinBtn: { en: "Sign in", th: "เข้าสู่ระบบ" },
  signinPending: { en: "Signing in…", th: "กำลังเข้าสู่ระบบ…" },
  signupBtn: { en: "Create account", th: "สมัครสมาชิก" },
  signupPending: { en: "Creating account…", th: "กำลังสมัครสมาชิก…" },
  forgotBtn: { en: "Send reset link", th: "ส่งลิงก์รีเซ็ต" },
  forgotPending: { en: "Sending…", th: "กำลังส่ง…" },
  // Mode switch links
  toSignup: { en: "Create account", th: "สมัครสมาชิก" },
  toForgot: { en: "Forgot password?", th: "ลืมรหัสผ่าน?" },
  toSignin: { en: "Back to sign in", th: "กลับไปเข้าสู่ระบบ" },
  // Errors
  invalidCreds: {
    en: "Incorrect email or password. Please try again.",
    th: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
  },
  passwordTooShort: {
    en: "Password must be at least 8 characters.",
    th: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  },
  passwordMismatch: {
    en: "Passwords do not match.",
    th: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
  },
  // Success panels
  signupSuccessTitle: {
    en: "Check your email",
    th: "ตรวจสอบอีเมลของคุณ",
  },
  signupSuccessBody: {
    en: "We sent a confirmation link to your email. Click it to activate your account.",
    th: "เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว กดลิงก์เพื่อเปิดใช้งานบัญชี",
  },
  forgotSuccessTitle: {
    en: "Reset link sent",
    th: "ส่งลิงก์รีเซ็ตแล้ว",
  },
  forgotSuccessBody: {
    en: "Check your email for a link to reset your password.",
    th: "ตรวจสอบอีเมลของคุณเพื่อกดลิงก์รีเซ็ตรหัสผ่าน",
  },
} satisfies Dict;

type Mode = "signin" | "signup" | "forgot";

const inputCls =
  "w-full rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink placeholder:text-ink-muted/50 focus:border-accent";
const primaryBtnCls =
  "w-full min-h-[44px] rounded-xl bg-accent px-5 py-2.5 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed";
const linkBtnCls =
  "min-h-[44px] px-2 text-sm font-medium text-accent cursor-pointer hover:underline";
const labelCls = "mb-1 block text-sm font-medium text-ink";

export default function LoginClient() {
  const t = useT(L);
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"signup" | "forgot" | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setDone(null);
    setPassword("");
    setConfirm("");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (password.length < 8) {
        setError(t("passwordTooShort"));
        return;
      }
      if (password !== confirm) {
        setError(t("passwordMismatch"));
        return;
      }
    }

    setPending(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(
            error.message === "Invalid login credentials"
              ? t("invalidCreds")
              : error.message
          );
        } else {
          window.location.assign("/");
          return; // keep pending state during full reload
        }
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
        if (error) setError(error.message);
        else setDone("signup");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) setError(error.message);
        else setDone("forgot");
      }
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-sm p-6 text-center">
        <h2 className="text-lg font-bold text-good">
          {done === "signup" ? t("signupSuccessTitle") : t("forgotSuccessTitle")}
        </h2>
        <p className="mt-2 text-sm text-good">
          {done === "signup" ? t("signupSuccessBody") : t("forgotSuccessBody")}
        </p>
        <div className="mt-4">
          <button
            type="button"
            className={linkBtnCls}
            onClick={() => switchMode("signin")}
          >
            {t("toSignin")}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-sm p-6">
      <h2 className="mb-4 text-lg font-bold text-ink">
        {mode === "signin"
          ? t("signinTitle")
          : mode === "signup"
            ? t("signupTitle")
            : t("forgotTitle")}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className={labelCls}>
            {t("email")}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>

        {mode !== "forgot" ? (
          <div>
            <label htmlFor="login-password" className={labelCls}>
              {t("password")}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "signup" ? 8 : undefined}
              disabled={pending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            {mode === "signup" ? (
              <p className="mt-1 text-xs text-ink-muted">
                {t("passwordHint")}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === "signup" ? (
          <div>
            <label htmlFor="login-confirm" className={labelCls}>
              {t("confirmPassword")}
            </label>
            <input
              id="login-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={pending}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={primaryBtnCls}>
          {mode === "signin"
            ? pending
              ? t("signinPending")
              : t("signinBtn")
            : mode === "signup"
              ? pending
                ? t("signupPending")
                : t("signupBtn")
              : pending
                ? t("forgotPending")
                : t("forgotBtn")}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {mode === "signin" ? (
          <>
            <button
              type="button"
              className={linkBtnCls}
              onClick={() => switchMode("signup")}
            >
              {t("toSignup")}
            </button>
            <button
              type="button"
              className={linkBtnCls}
              onClick={() => switchMode("forgot")}
            >
              {t("toForgot")}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={linkBtnCls}
            onClick={() => switchMode("signin")}
          >
            {t("toSignin")}
          </button>
        )}
      </div>
    </Card>
  );
}
