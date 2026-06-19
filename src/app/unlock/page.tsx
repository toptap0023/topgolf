"use client";

import { useState, useTransition } from "react";
import { unlock, revealPin } from "./actions";
import { FlagIcon } from "@/components/icons";

export default function UnlockPage() {
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRecover, setShowRecover] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submitPin() {
    setError(null);
    const fd = new FormData();
    fd.set("pin", pin);
    fd.set(
      "next",
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") || "/"
        : "/"
    );
    start(async () => {
      const res = await unlock(fd);
      if (res?.error) setError(res.error);
    });
  }

  function reveal() {
    setError(null);
    const fd = new FormData();
    fd.set("code", code);
    start(async () => {
      const res = await revealPin(fd);
      if (res.error) setError(res.error);
      else setRevealed(res.pin ?? null);
    });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6">
      <div className="flex items-center gap-2 font-bold text-ink">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-bg shadow-glow">
          <FlagIcon className="h-6 w-6" />
        </span>
        <span className="text-2xl tracking-tight">
          TOP<span className="text-accent">golf</span>
        </span>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <label className="text-center text-sm text-ink-muted" htmlFor="pin">
          ใส่ PIN เพื่อเข้าใช้งาน
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitPin()}
          placeholder="••••••"
          className="rounded-xl border border-line bg-bg-panel px-4 py-3 text-center text-xl tracking-[0.4em] text-ink focus:border-accent"
        />
        <button
          type="button"
          onClick={submitPin}
          disabled={pending || !pin.trim()}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {pending ? "กำลังตรวจสอบ…" : "ปลดล็อก"}
        </button>

        {error ? (
          <p role="alert" className="text-center text-sm text-bad">
            {error}
          </p>
        ) : null}

        {!showRecover ? (
          <button
            type="button"
            onClick={() => {
              setShowRecover(true);
              setError(null);
            }}
            className="text-center text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer"
          >
            ลืม PIN?
          </button>
        ) : (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-line bg-bg-panel2 p-3">
            {revealed ? (
              <p className="text-center text-sm text-ink">
                PIN ของคุณคือ{" "}
                <b className="tnum text-lg tracking-widest text-accent">
                  {revealed}
                </b>
              </p>
            ) : (
              <>
                <label className="text-xs text-ink-muted" htmlFor="code">
                  ใส่รหัสกู้คืน 4 หลัก (วัน/เดือนเกิด) เพื่อดู PIN
                </label>
                <div className="flex gap-2">
                  <input
                    id="code"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && reveal()}
                    placeholder="••••"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-bg-panel px-3 py-2 text-center tracking-[0.3em] text-ink focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={reveal}
                    disabled={pending || !code.trim()}
                    className="rounded-lg bg-bg-panel px-3 py-2 text-sm font-semibold text-ink hover:text-accent disabled:opacity-50 cursor-pointer"
                  >
                    ดู PIN
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
