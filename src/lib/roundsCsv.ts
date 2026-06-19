import { parseCsvRows } from "./garmin";
import { todayISO } from "./format";

export interface RoundInput {
  played_on: string; // YYYY-MM-DD
  course: string | null;
  score: number | null;
  par: number | null;
  holes: number | null;
  putts: number | null;
  fairways_hit: number | null;
  greens_in_regulation: number | null;
  notes: string | null;
}

export interface RoundParseResult {
  rounds: RoundInput[];
  unmappedHeaders: string[];
  errors: string[];
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

const SYNONYMS: Record<string, keyof RoundInput> = {
  date: "played_on",
  played: "played_on",
  playedon: "played_on",
  day: "played_on",
  course: "course",
  coursename: "course",
  score: "score",
  total: "score",
  totalscore: "score",
  strokes: "score",
  gross: "score",
  grossscore: "score",
  par: "par",
  holes: "holes",
  putts: "putts",
  totalputts: "putts",
  fairways: "fairways_hit",
  fairwayshit: "fairways_hit",
  fir: "fairways_hit",
  fw: "fairways_hit",
  gir: "greens_in_regulation",
  greens: "greens_in_regulation",
  greensinregulation: "greens_in_regulation",
  note: "notes",
  notes: "notes",
};

const NUMERIC = new Set<keyof RoundInput>([
  "score",
  "par",
  "holes",
  "putts",
  "fairways_hit",
  "greens_in_regulation",
]);

function toNum(v: string): number | null {
  const n = parseInt(v.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toDate(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso)
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = t.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (dmy) {
    let y = +dmy[3];
    if (y > 2400) y -= 543; // Thai Buddhist era
    return `${y}-${String(+dmy[2]).padStart(2, "0")}-${String(+dmy[1]).padStart(2, "0")}`;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function parseRoundsCsv(text: string): RoundParseResult {
  const errors: string[] = [];
  const rows = parseCsvRows(text);
  if (rows.length === 0)
    return { rounds: [], unmappedHeaders: [], errors: ["The CSV is empty."] };

  // header row = the one mapping the most columns within the first few rows
  let headerIdx = 0;
  let best = -1;
  for (let r = 0; r < Math.min(4, rows.length); r++) {
    const score = rows[r].reduce((a, h) => a + (SYNONYMS[norm(h)] ? 1 : 0), 0);
    if (score > best) {
      best = score;
      headerIdx = r;
    }
  }

  const headers = rows[headerIdx].map((h) => h.trim());
  const colField = headers.map((h) => SYNONYMS[norm(h)] ?? null);
  const unmappedHeaders = headers.filter((h, i) => !colField[i] && h.trim());

  const rounds: RoundInput[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const cells = rows[r];
    const round: RoundInput = {
      played_on: "",
      course: null,
      score: null,
      par: null,
      holes: null,
      putts: null,
      fairways_hit: null,
      greens_in_regulation: null,
      notes: null,
    };
    let has = false;
    headers.forEach((_h, i) => {
      const field = colField[i];
      const value = (cells[i] ?? "").trim();
      if (!field || value === "") return;
      has = true;
      if (field === "played_on") round.played_on = toDate(value) ?? "";
      else if (field === "course") round.course = value;
      else if (field === "notes") round.notes = value;
      else if (NUMERIC.has(field))
        (round as unknown as Record<string, number | null>)[field] =
          toNum(value);
    });
    // need at least a score to be a usable round
    if (!has || round.score == null) continue;
    if (!round.played_on) round.played_on = todayISO();
    rounds.push(round);
  }

  if (rounds.length === 0)
    errors.push("No rounds with a score were found. Expected a 'score' column.");
  return { rounds, unmappedHeaders, errors };
}

/** Prompt to paste into Gemini/any AI alongside a scorecard photo. */
export function buildScorecardPrompt(): string {
  return `อ่านรูปสกอร์การ์ดกอล์ฟใบนี้ แล้วตอบกลับเป็น "CSV ดิบ" เท่านั้น ห้ามมีคำอธิบาย ห้ามใส่ \`\`\` หรือ markdown.
(Read this golf scorecard photo and reply with RAW CSV only — no explanation, no markdown, no code fences.)

First line must be exactly this header:
date,course,score,putts,fairways,gir

Then one row per round. Rules:
- date: the round date as YYYY-MM-DD. If the card shows a Thai Buddhist year (e.g. 2569), subtract 543. If no date, leave it blank.
- course: course name if shown, else blank.
- score: TOTAL strokes for the 18 holes (the "Total" / "Gross" box). Numbers only.
- putts: total putts if recorded, else blank.
- fairways: number of fairways hit if recorded, else blank.
- gir: number of greens in regulation if recorded, else blank.
- No symbols, no commas inside numbers.

Example:
date,course,score,putts,fairways,gir
2026-05-18,Alpine GC,98,34,7,6`;
}
