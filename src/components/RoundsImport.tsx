"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  parseRoundsCsv,
  buildScorecardPrompt,
  type RoundInput,
} from "@/lib/roundsCsv";
import { importRounds } from "@/app/actions";
import { formatDate } from "@/lib/format";
import { Card } from "./ui";
import { CopyIcon, CheckIcon, UploadIcon } from "./icons";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

export function RoundsImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [rounds, setRounds] = useState<RoundInput[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pending, start] = useTransition();

  const prompt = buildScorecardPrompt();

  async function copyPrompt() {
    const ok = await copyText(prompt);
    if (ok) {
      setCopied(true);
      setShowPrompt(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setShowPrompt(true);
    }
  }

  function preview() {
    setError(null);
    const res = parseRoundsCsv(csv);
    if (!res.rounds.length) {
      setRounds(null);
      setError(res.errors[0] ?? "No rounds found.");
      return;
    }
    setRounds(res.rounds);
  }

  function confirm() {
    if (!rounds?.length) return;
    start(async () => {
      const res = await importRounds(rounds);
      if (res.error) {
        setError(res.error);
        return;
      }
      setCsv("");
      setRounds(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Import from scorecard</h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-sm font-medium text-accent cursor-pointer"
        >
          <UploadIcon className="h-4 w-4" />
          {open ? "Hide" : "Import CSV"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-ink-muted">
            ถ่ายรูป scorecard → วาง prompt นี้ใน Gemini พร้อมรูป → ก๊อป CSV ที่ได้
            มาวางด้านล่าง. (Photograph your scorecard, paste this prompt into
            Gemini with the photo, then paste the CSV it returns below.)
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyPrompt}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-bg-panel2 px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-200 hover:border-accent hover:text-accent cursor-pointer"
            >
              {copied ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy AI scorecard prompt"}
            </button>
            <button
              type="button"
              onClick={() => setShowPrompt((s) => !s)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink cursor-pointer"
            >
              {showPrompt ? "Hide prompt" : "View prompt"}
            </button>
          </div>
          {showPrompt ? (
            <textarea
              readOnly
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
              rows={6}
              aria-label="AI scorecard prompt"
              className="w-full resize-none rounded-xl border border-line bg-bg-panel px-3 py-2 text-xs text-ink"
            />
          ) : null}

          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={4}
            placeholder={"date,course,score,putts,fairways,gir\n2026-05-18,Alpine GC,98,34,7,6"}
            aria-label="Rounds CSV"
            className="w-full resize-none rounded-xl border border-line bg-bg-panel px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-muted/50 focus:border-accent"
          />

          <button
            type="button"
            onClick={preview}
            disabled={!csv.trim()}
            className="self-start rounded-xl border border-line bg-bg-panel2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Preview
          </button>

          {error ? (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}

          {rounds?.length ? (
            <>
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      <th className="px-2 py-2 text-left">Date</th>
                      <th className="px-2 py-2 text-left">Course</th>
                      <th className="px-2 py-2 text-right">Score</th>
                      <th className="px-2 py-2 text-right">Putts</th>
                      <th className="px-2 py-2 text-right">FW</th>
                      <th className="px-2 py-2 text-right">GIR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r, i) => (
                      <tr key={i} className="border-b border-line/50 last:border-0">
                        <td className="px-2 py-1.5 text-sm">
                          {formatDate(r.played_on)}
                        </td>
                        <td className="px-2 py-1.5 text-sm">{r.course ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right text-sm font-semibold tnum">
                          {r.score ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right text-sm tnum text-ink-muted">
                          {r.putts ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right text-sm tnum text-ink-muted">
                          {r.fairways_hit ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right text-sm tnum text-ink-muted">
                          {r.greens_in_regulation ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {pending
                  ? "Importing…"
                  : `Import ${rounds.length} round${rounds.length === 1 ? "" : "s"}`}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
