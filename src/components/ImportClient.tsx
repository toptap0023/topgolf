"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseGarminCsv, dateFromFilename, type ParseResult } from "@/lib/garmin";
import { aggregateByClub } from "@/lib/stats";
import type { Shot } from "@/lib/types";
import { importSession } from "@/app/actions";
import { todayISO, fmt, distanceUnitLabel, speedUnitLabel } from "@/lib/format";
import { useT, type Dict } from "@/lib/i18n";
import { Card, SectionTitle } from "@/components/ui";
import { DownloadIcon, CheckIcon } from "@/components/icons";

const L = {
  title: { en: "Import a Garmin range CSV", th: "นำเข้า CSV ซ้อมไดร์ฟจาก Garmin" },
  sub: {
    en: "In the Garmin Golf app, open a range session → ⋯ menu → Export / Share → CSV. Drop the file here or paste its contents.",
    th: "ในแอป Garmin Golf เปิดเซสชันซ้อม → เมนู ⋯ → Export / Share → CSV แล้วเลือกไฟล์ที่นี่ หรือวางเนื้อหาไฟล์ด้านล่าง",
  },
  chooseFile: { en: "Choose CSV file", th: "เลือกไฟล์ CSV" },
  selected: { en: "Selected:", th: "เลือกแล้ว:" },
  preview: { en: "Preview", th: "ดูตัวอย่าง" },
  pasteFirst: {
    en: "Paste CSV text or choose a file first.",
    th: "วางข้อความ CSV หรือเลือกไฟล์ก่อน",
  },
  noShots: { en: "No shots found.", th: "ไม่พบช็อต" },
  parsed: { en: "Parsed", th: "อ่านได้" },
  shotsWord: { en: "shots", th: "ช็อต" },
  clubsWord: { en: "clubs", th: "ไม้" },
  unitsWord: { en: "units", th: "หน่วย" },
  ignoredCols: { en: "Ignored columns:", th: "คอลัมน์ที่ไม่ใช้:" },
  datePlayed: { en: "Date played", th: "วันที่เล่น" },
  titleOptional: { en: "Title (optional)", th: "ชื่อ (ไม่บังคับ)" },
  locationOptional: { en: "Location (optional)", th: "สถานที่ (ไม่บังคับ)" },
  rangeSession: { en: "Range session", th: "เซสชันซ้อม" },
  drivingRange: { en: "Driving range", th: "สนามไดร์ฟ" },
  importing: { en: "Importing…", th: "กำลังนำเข้า…" },
  importShots: {
    en: "Import {n} shots as a session",
    th: "นำเข้า {n} ช็อตเป็นหนึ่งเซสชัน",
  },
} satisfies Dict;

const PLACEHOLDER =
  "Club,Date,Ball Speed,Club Speed,Smash Factor,Launch Angle,Carry Distance,Total Distance,Spin Rate,Carry Deviation Distance\n7 Iron,2026-06-19 06:23,112,82,1.37,18.5,152,160,6200,3.2R";

export function ImportClient() {
  const router = useRouter();
  const t = useT(L);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [playedOn, setPlayedOn] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function ingest(raw: string, name?: string) {
    const res = parseGarminCsv(raw);
    setResult(res);
    setError(res.shots.length ? null : res.errors[0] ?? t("noShots"));
    const guess = res.dateGuess ?? (name ? dateFromFilename(name) : null);
    if (guess) setPlayedOn(guess);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result ?? "");
      setText(t);
      ingest(t, f.name);
    };
    reader.readAsText(f);
  }

  function onPreview() {
    if (!text.trim()) {
      setError(t("pasteFirst"));
      return;
    }
    ingest(text, filename ?? undefined);
  }

  function onConfirm() {
    if (!result || !result.shots.length) return;
    start(async () => {
      const res = await importSession({
        session: {
          played_on: playedOn,
          title: title.trim() || null,
          location: location.trim() || null,
          source_filename: filename,
          distance_unit: result.distanceUnit,
          speed_unit: result.speedUnit,
          notes: null,
        },
        shots: result.shots,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.sessionId) {
        router.push(`/sessions/${res.sessionId}`);
        router.refresh();
      }
    });
  }

  const aggs = result
    ? aggregateByClub(result.shots as unknown as Shot[])
    : [];

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <SectionTitle sub={t("sub")}>{t("title")}</SectionTitle>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg-panel2 px-4 py-4 text-sm font-medium text-ink-muted transition-colors duration-200 hover:border-accent hover:text-accent cursor-pointer"
          >
            <DownloadIcon className="h-5 w-5" />
            {filename ? `${t("selected")} ${filename}` : t("chooseFile")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={PLACEHOLDER}
            aria-label="CSV contents"
            className="w-full resize-none rounded-xl border border-line bg-bg-panel px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-muted/50 focus:border-accent"
          />

          <button
            type="button"
            onClick={onPreview}
            disabled={!text.trim()}
            className="self-start rounded-xl border border-line bg-bg-panel2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {t("preview")}
          </button>

          {error ? (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}
        </div>
      </Card>

      {result && result.shots.length > 0 ? (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2 rounded-xl bg-good/10 px-4 py-3 text-sm text-good">
            <CheckIcon className="h-5 w-5 shrink-0" />
            <span>
              {t("parsed")} <b className="tnum">{result.shots.length}</b>{" "}
              {t("shotsWord")} · <b>{aggs.length}</b> {t("clubsWord")} ·{" "}
              {t("unitsWord")} {distanceUnitLabel(result.distanceUnit)} /{" "}
              {speedUnitLabel(result.speedUnit)}
            </span>
          </div>

          {result.unmappedHeaders.length ? (
            <p className="text-[11px] text-ink-muted">
              {t("ignoredCols")} {result.unmappedHeaders.join(", ")}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-muted">{t("datePlayed")}</span>
              <input
                type="date"
                value={playedOn}
                onChange={(e) => setPlayedOn(e.target.value)}
                className="rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink focus:border-accent cursor-pointer"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-muted">{t("titleOptional")}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("rangeSession")}
                className="rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink placeholder:text-ink-muted/50 focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-muted">{t("locationOptional")}</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("drivingRange")}
                className="rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink placeholder:text-ink-muted/50 focus:border-accent"
              />
            </label>
          </div>

          <div className="-mx-1 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 text-left">Club</th>
                  <th className="px-3 py-2 text-right">Shots</th>
                  <th className="px-3 py-2 text-right">Avg carry</th>
                  <th className="px-3 py-2 text-right">Avg smash</th>
                </tr>
              </thead>
              <tbody>
                {aggs.map((a) => (
                  <tr key={a.club} className="border-b border-line/50 last:border-0">
                    <td className="px-3 py-1.5 text-sm font-medium">{a.club}</td>
                    <td className="px-3 py-1.5 text-right text-sm tnum text-ink-muted">
                      {a.count}
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm tnum">
                      {fmt(a.carry.mean)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm tnum">
                      {fmt(a.smash.mean, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-xl bg-accent px-4 py-3.5 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {pending
              ? t("importing")
              : t("importShots").replace("{n}", String(result.shots.length))}
          </button>
        </Card>
      ) : null}
    </div>
  );
}
