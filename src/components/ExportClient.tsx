"use client";

import { useMemo, useState } from "react";
import { useT, type Dict } from "@/lib/i18n";
import { useGoal } from "@/lib/goal";
import { Card, SectionTitle } from "./ui";
import { DownloadIcon, CopyIcon, CheckIcon } from "./icons";
import type { Shot, GolfSession, GolfRound } from "@/lib/types";
import { aggregateByClub, overallKpis } from "@/lib/stats";
import { shotsToCsv, clubTableCsv, roundsToCsv, buildCoachPrompt } from "@/lib/csv";

const L = {
  exportCsv: { en: "Export CSV", th: "ส่งออก CSV" },
  exportCsvSub: {
    en: "Download to a file, or copy straight to your clipboard to paste into any AI / spreadsheet.",
    th: "ดาวน์โหลดเป็นไฟล์ หรือคัดลอกไปวางใน AI / สเปรดชีตอะไรก็ได้",
  },
  dayFilter: { en: "Day", th: "วัน" },
  allDays: { en: "All sessions", th: "ทุกวัน" },
  dayScopeNote: {
    en: "Shots CSV, club summary & AI prompt use the selected day. Rounds always export in full.",
    th: "CSV ช็อต, สรุปรายไม้ และ prompt AI ใช้เฉพาะวันที่เลือก · Rounds ส่งออกครบทุกครั้ง",
  },
  shotsWord: { en: "shots", th: "ช็อต" },
  clubSummaryTitle: { en: "Club summary (every club)", th: "สรุปรายไม้ (ทุกไม้)" },
  clubSummaryDesc: {
    en: "Per-club averages: carry, dispersion, smash, launch, spin, path, face, shape.",
    th: "ค่าเฉลี่ยต่อไม้: carry, dispersion, smash, launch, spin, path, face, shape",
  },
  allShotsTitle: { en: "All shots", th: "ช็อตทั้งหมด" },
  allShotsDesc: {
    en: "Every shot, one row each · {n} total.",
    th: "ทุกช็อต แถวละหนึ่งช็อต · รวม {n} ช็อต",
  },
  roundsTitle: { en: "Rounds / scorecards", th: "รอบ / scorecard" },
  roundsDesc1: {
    en: "Your logged 18-hole scores · 1 round.",
    th: "สกอร์ 18 หลุมที่บันทึกไว้ · 1 รอบ",
  },
  roundsDescN: {
    en: "Your logged 18-hole scores · {n} rounds.",
    th: "สกอร์ 18 หลุมที่บันทึกไว้ · {n} รอบ",
  },
  download: { en: "Download", th: "ดาวน์โหลด" },
  copy: { en: "Copy", th: "คัดลอก" },
  copiedShort: { en: "Copied", th: "คัดลอกแล้ว" },
  coachTitle: { en: "AI coach prompt", th: "Prompt โค้ช AI" },
  coachSub: {
    en: "A ready-made prompt with your stats built in · paste into Gemini, ChatGPT, or Claude for a personalized plan.",
    th: "Prompt สำเร็จรูปพร้อมสถิติของคุณ · วางใน Gemini, ChatGPT หรือ Claude เพื่อรับแผนซ้อมเฉพาะตัว",
  },
  copyCoach: { en: "Copy AI coach prompt", th: "คัดลอก prompt โค้ช AI" },
  copied: { en: "Copied!", th: "คัดลอกแล้ว!" },
  hide: { en: "Hide", th: "ซ่อน" },
  previewPrompt: { en: "Preview prompt", th: "ดูตัวอย่าง prompt" },
} satisfies Dict;

function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ExportRow({
  title,
  desc,
  content,
  filename,
  disabled,
}: {
  title: string;
  desc: string;
  content: string;
  filename: string;
  disabled?: boolean;
}) {
  const t = useT(L);
  const [copied, setCopied] = useState(false);
  const btn =
    "flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold transition-colors duration-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg-panel2 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-muted">{desc}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => download(filename, content)}
          className={`${btn} bg-bg-panel text-ink hover:border-accent hover:text-accent`}
        >
          <DownloadIcon className="h-4 w-4" />
          {t("download")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={async () => {
            if (await copyText(content)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }}
          className={`${btn} bg-bg-panel text-ink hover:border-accent hover:text-accent`}
        >
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
          {copied ? t("copiedShort") : t("copy")}
        </button>
      </div>
    </div>
  );
}

// Human day label from YYYY-MM-DD (built at noon UTC to dodge tz off-by-one).
function dayLabel(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExportClient({
  shots,
  sessions,
  rounds,
}: {
  shots: Shot[];
  sessions: GolfSession[];
  rounds: GolfRound[];
}) {
  const t = useT(L);
  const [{ target }] = useGoal();
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const [day, setDay] = useState("all"); // "all" | YYYY-MM-DD

  const byId = useMemo(
    () => Object.fromEntries(sessions.map((s) => [s.id, s])),
    [sessions]
  );
  // Days that actually have practice sessions, newest first.
  const dates = useMemo(() => {
    const set = new Set(sessions.filter((s) => s.played_on).map((s) => s.played_on));
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [sessions]);

  // Shots scoped to the chosen day (via their session's played_on).
  const scopedShots = useMemo(
    () =>
      day === "all"
        ? shots
        : shots.filter((s) => byId[s.session_id]?.played_on === day),
    [shots, byId, day]
  );

  const distanceUnit = sessions[0]?.distance_unit ?? "yds";
  const speedUnit = sessions[0]?.speed_unit ?? "mph";
  const current = rounds.find((r) => r.score != null)?.score ?? null;

  // Rebuild exports for the current scope. Rounds stay full (separate data).
  const { clubCsv, allShotsCsv, roundsCsv, coachPrompt } = useMemo(() => {
    const aggs = aggregateByClub(scopedShots);
    return {
      clubCsv: clubTableCsv(aggs, distanceUnit, speedUnit),
      allShotsCsv: shotsToCsv(scopedShots, byId),
      roundsCsv: roundsToCsv(rounds),
      coachPrompt: buildCoachPrompt({
        aggs,
        kpis: overallKpis(scopedShots),
        rounds,
        distanceUnit,
        speedUnit,
        currentScore: current,
        targetScore: target,
        scopeNote:
          day !== "all"
            ? `This is a single practice session on ${day}. Focus your feedback on today's numbers and what to work on next session.`
            : undefined,
      }),
    };
  }, [scopedShots, byId, rounds, distanceUnit, speedUnit, current, target, day]);

  const shotCount = scopedShots.length;
  const roundCount = rounds.length;
  const tag = day === "all" ? stamp() : day; // filename date suffix

  async function copyPrompt() {
    if (await copyText(coachPrompt)) {
      setCopied(true);
      setShow(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setShow(true);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-3 p-5">
        <SectionTitle sub={t("exportCsvSub")}>{t("exportCsv")}</SectionTitle>

        {/* Day scope · shots CSV, club summary & AI prompt honour this. */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="export-day" className="text-sm font-medium text-ink-muted">
            {t("dayFilter")}
          </label>
          <select
            id="export-day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="cursor-pointer rounded-lg border border-line bg-bg-panel px-3 py-1.5 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">{t("allDays")}</option>
            {dates.map((dd) => (
              <option key={dd} value={dd}>
                {dayLabel(dd)}
              </option>
            ))}
          </select>
          {day !== "all" ? (
            <span className="text-xs text-ink-muted">· {shotCount} {t("shotsWord")}</span>
          ) : null}
        </div>
        <p className="-mt-1 text-xs text-ink-muted">{t("dayScopeNote")}</p>

        <ExportRow
          title={t("clubSummaryTitle")}
          desc={t("clubSummaryDesc")}
          content={clubCsv}
          filename={`topgolfer-club-summary-${tag}.csv`}
          disabled={shotCount === 0}
        />
        <ExportRow
          title={t("allShotsTitle")}
          desc={t("allShotsDesc").replace("{n}", String(shotCount))}
          content={allShotsCsv}
          filename={`topgolfer-shots-${tag}.csv`}
          disabled={shotCount === 0}
        />
        <ExportRow
          title={t("roundsTitle")}
          desc={
            roundCount === 1
              ? t("roundsDesc1")
              : t("roundsDescN").replace("{n}", String(roundCount))
          }
          content={roundsCsv}
          filename={`topgolfer-rounds-${stamp()}.csv`}
          disabled={roundCount === 0}
        />
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <SectionTitle sub={t("coachSub")}>{t("coachTitle")}</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyPrompt}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
          >
            {copied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
            {copied ? t("copied") : t("copyCoach")}
          </button>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-bg-panel2 px-4 py-3 text-sm font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent cursor-pointer"
          >
            {show ? t("hide") : t("previewPrompt")}
          </button>
        </div>
        {show ? (
          <textarea
            readOnly
            value={coachPrompt}
            onFocus={(e) => e.currentTarget.select()}
            rows={14}
            aria-label="AI coach prompt"
            className="w-full resize-none rounded-xl border border-line bg-bg-panel px-3 py-2 font-mono text-xs text-ink"
          />
        ) : null}
      </Card>
    </div>
  );
}
