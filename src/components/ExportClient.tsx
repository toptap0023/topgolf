"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { DownloadIcon, CopyIcon, CheckIcon } from "./icons";

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
          Download
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
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function ExportClient({
  allShotsCsv,
  clubCsv,
  roundsCsv,
  coachPrompt,
  shotCount,
  roundCount,
}: {
  allShotsCsv: string;
  clubCsv: string;
  roundsCsv: string;
  coachPrompt: string;
  shotCount: number;
  roundCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);

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
        <SectionTitle sub="Download to a file, or copy straight to your clipboard to paste into any AI / spreadsheet.">
          Export CSV
        </SectionTitle>
        <ExportRow
          title="Club summary (every club)"
          desc="Per-club averages: carry, dispersion, smash, launch, spin, path, face, shape."
          content={clubCsv}
          filename={`topgolfer-club-summary-${stamp()}.csv`}
          disabled={shotCount === 0}
        />
        <ExportRow
          title="All shots"
          desc={`Every shot, one row each — ${shotCount} total.`}
          content={allShotsCsv}
          filename={`topgolfer-shots-${stamp()}.csv`}
          disabled={shotCount === 0}
        />
        <ExportRow
          title="Rounds / scorecards"
          desc={`Your logged 18-hole scores — ${roundCount} round${roundCount === 1 ? "" : "s"}.`}
          content={roundsCsv}
          filename={`topgolfer-rounds-${stamp()}.csv`}
          disabled={roundCount === 0}
        />
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <SectionTitle sub="A ready-made prompt with your stats built in — paste into Gemini, ChatGPT, or Claude for a personalized plan.">
          AI coach prompt
        </SectionTitle>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyPrompt}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
          >
            {copied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
            {copied ? "Copied!" : "Copy AI coach prompt"}
          </button>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-bg-panel2 px-4 py-3 text-sm font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent cursor-pointer"
          >
            {show ? "Hide" : "Preview prompt"}
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
