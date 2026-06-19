"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseGarminCsv, dateFromFilename, type ParseResult } from "@/lib/garmin";
import { aggregateByClub } from "@/lib/stats";
import type { Shot } from "@/lib/types";
import { importSession } from "@/app/actions";
import { todayISO, fmt, distanceUnitLabel, speedUnitLabel } from "@/lib/format";
import { Card, SectionTitle } from "@/components/ui";
import { UploadIcon, CheckIcon } from "@/components/icons";

const PLACEHOLDER =
  "Club,Date,Ball Speed,Club Speed,Smash Factor,Launch Angle,Carry Distance,Total Distance,Spin Rate,Carry Deviation Distance\n7 Iron,2026-06-19 06:23,112,82,1.37,18.5,152,160,6200,3.2R";

export function ImportClient() {
  const router = useRouter();
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
    setError(res.shots.length ? null : res.errors[0] ?? "No shots found.");
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
      setError("Paste CSV text or choose a file first.");
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
        <SectionTitle sub="In the Garmin Golf app, open a range session → ⋯ menu → Export / Share → CSV. Drop the file here or paste its contents.">
          Import a Garmin range CSV
        </SectionTitle>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg-panel2 px-4 py-4 text-sm font-medium text-ink-muted transition-colors duration-200 hover:border-accent hover:text-accent cursor-pointer"
          >
            <UploadIcon className="h-5 w-5" />
            {filename ? `Selected: ${filename}` : "Choose CSV file"}
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
            Preview
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
              Parsed <b className="tnum">{result.shots.length}</b> shots ·{" "}
              <b>{aggs.length}</b> clubs · units{" "}
              {distanceUnitLabel(result.distanceUnit)} /{" "}
              {speedUnitLabel(result.speedUnit)}
            </span>
          </div>

          {result.unmappedHeaders.length ? (
            <p className="text-[11px] text-ink-muted">
              Ignored columns: {result.unmappedHeaders.join(", ")}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-muted">Date played</span>
              <input
                type="date"
                value={playedOn}
                onChange={(e) => setPlayedOn(e.target.value)}
                className="rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink focus:border-accent cursor-pointer"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-muted">Title (optional)</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Range session"
                className="rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink placeholder:text-ink-muted/50 focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink-muted">Location (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Driving range"
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
              ? "Importing…"
              : `Import ${result.shots.length} shots as a session`}
          </button>
        </Card>
      ) : null}
    </div>
  );
}
