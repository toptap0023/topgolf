import type { ParsedShot, DistanceUnit, SpeedUnit } from "./types";
import { normalizeClub } from "./clubs";

export interface ParseResult {
  shots: ParsedShot[];
  headers: string[];
  mappedFields: Record<string, string>; // canonical field -> original header
  unmappedHeaders: string[];
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
  dateGuess: string | null; // YYYY-MM-DD inferred from shot timestamps
  errors: string[];
}

/* ----------------------------- CSV tokenizer ----------------------------- */
/** RFC4180-ish: handles quoted fields, escaped quotes, and CRLF/LF. */
export function parseCsvRows(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/* --------------------------- Header → field map -------------------------- */
const norm = (h: string) =>
  h
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // drop "(mph)" etc.
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]/g, "");

// normalized header -> canonical Shot field name
const SYNONYMS: Record<string, string> = {
  club: "club",
  clubtype: "club",
  clubname: "club",
  clubused: "club",
  shot: "shot_index",
  shotnumber: "shot_index",
  shotno: "shot_index",
  ballspeed: "ball_speed",
  clubspeed: "club_speed",
  clubheadspeed: "club_speed",
  headspeed: "club_speed",
  smashfactor: "smash_factor",
  smash: "smash_factor",
  efficiency: "smash_factor",
  launchangle: "launch_angle",
  verticallaunchangle: "launch_angle",
  launchanglevertical: "launch_angle",
  launchv: "launch_angle",
  launchdirection: "launch_direction",
  horizontallaunchangle: "launch_direction",
  launchanglehorizontal: "launch_direction",
  launchdir: "launch_direction",
  launchh: "launch_direction",
  azimuth: "launch_direction",
  spinrate: "spin_rate",
  totalspin: "spin_rate",
  spin: "spin_rate",
  spinaxis: "spin_axis",
  backspin: "backspin",
  sidespin: "sidespin",
  apex: "apex_height",
  apexheight: "apex_height",
  maxheight: "apex_height",
  peakheight: "apex_height",
  height: "apex_height",
  carry: "carry_distance",
  carrydistance: "carry_distance",
  total: "total_distance",
  totaldistance: "total_distance",
  distance: "total_distance",
  carrydeviationangle: "carry_deviation_angle",
  carrydevangle: "carry_deviation_angle",
  carrydeviationdistance: "carry_deviation_distance",
  carrydevdistance: "carry_deviation_distance",
  carryside: "carry_deviation_distance",
  carrylateral: "carry_deviation_distance",
  carryoffline: "carry_deviation_distance",
  totaldeviationangle: "total_deviation_angle",
  deviationangle: "total_deviation_angle",
  totaldevangle: "total_deviation_angle",
  totaldeviationdistance: "total_deviation_distance",
  totaldevdistance: "total_deviation_distance",
  sidedistance: "total_deviation_distance",
  lateral: "total_deviation_distance",
  offline: "total_deviation_distance",
  totaloffline: "total_deviation_distance",
  attackangle: "attack_angle",
  angleofattack: "attack_angle",
  aoa: "attack_angle",
  clubpath: "club_path",
  path: "club_path",
  clubface: "club_face",
  faceangle: "club_face",
  face: "club_face",
  facetopath: "face_to_path",
  facepath: "face_to_path",
  date: "shot_time",
  time: "shot_time",
  datetime: "shot_time",
  timestamp: "shot_time",
  shotdate: "shot_time",
  shottime: "shot_time",
  createddate: "shot_time",
  playdate: "shot_time",
  note: "note",
  notes: "note",
  tag: "note",
  comment: "note",
  comments: "note",
};

const NUMERIC_FIELDS = new Set<string>([
  "ball_speed",
  "club_speed",
  "smash_factor",
  "launch_angle",
  "launch_direction",
  "spin_rate",
  "spin_axis",
  "backspin",
  "sidespin",
  "apex_height",
  "carry_distance",
  "total_distance",
  "carry_deviation_angle",
  "carry_deviation_distance",
  "total_deviation_angle",
  "total_deviation_distance",
  "attack_angle",
  "club_path",
  "club_face",
  "face_to_path",
]);

/** Parse a numeric cell. Handles thousands commas, units, and L/R suffixes
 *  (Left = negative, Right = positive). Returns null for blanks/NA. */
function num(v: string | undefined | null): number | null {
  if (v == null) return null;
  const s0 = String(v).trim();
  if (s0 === "" || s0 === "-" || s0 === "--" || /^(na|nan|n\/a|null)$/i.test(s0))
    return null;
  const compact = s0.replace(/\s+/g, "");
  const hasL = /l$/i.test(compact);
  const hasR = /r$/i.test(compact);
  const s = s0.replace(/,/g, "").replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  let n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  if (hasL) n = -Math.abs(n);
  else if (hasR) n = Math.abs(n);
  return n;
}

function parseDate(s: string): string | null {
  const t = s.trim();
  if (!t) return null;

  // Thai Buddhist era, as the Garmin Golf app exports it in Thai locale:
  // "18/5/2569 BE 18:04:36" → D/M/Y(BE) H:M:S, where AD year = BE − 543.
  const be = t.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*BE\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  );
  if (be) {
    const dt = new Date(
      +be[3] - 543,
      +be[2] - 1,
      +be[1],
      +be[4],
      +be[5],
      +(be[6] ?? 0)
    );
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString();

  // Plain D/M/Y [H:M:S] fallback (non-US ordering).
  const m = t.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (m) {
    const dt = new Date(
      +m[3],
      +m[2] - 1,
      +m[1],
      +(m[4] ?? 0),
      +(m[5] ?? 0),
      +(m[6] ?? 0)
    );
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  return null;
}

/** A row like ",,,,,[mph],[deg],[Yards],…" — the units line Garmin puts under
 *  the header. Detected so it is never imported as a shot. */
const isUnitsRow = (cells: string[]) =>
  cells.filter((c) => /^\s*\[[^\]]*\]\s*$/.test(c)).length >= 3;

function emptyShot(): ParsedShot {
  return {
    shot_index: null,
    shot_time: null,
    club: null,
    club_category: null,
    ball_speed: null,
    club_speed: null,
    smash_factor: null,
    launch_angle: null,
    launch_direction: null,
    spin_rate: null,
    spin_axis: null,
    backspin: null,
    sidespin: null,
    apex_height: null,
    carry_distance: null,
    total_distance: null,
    carry_deviation_angle: null,
    carry_deviation_distance: null,
    total_deviation_angle: null,
    total_deviation_distance: null,
    attack_angle: null,
    club_path: null,
    club_face: null,
    face_to_path: null,
    note: null,
    raw: null,
  };
}

function detectUnits(cells: string[]): {
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
} {
  // Garmin keeps carry/total distance in the chosen distance unit; ignore the
  // apex "[m]" by only flipping to metres when yards is absent everywhere.
  const hj = cells.join("|").toLowerCase();
  const distanceUnit: DistanceUnit =
    /yard|yds/.test(hj)
      ? "yds"
      : /metre|meter|\[m\]|\(m\)/.test(hj)
        ? "m"
        : "yds";
  const speedUnit: SpeedUnit = /km\/?h|kph/.test(hj)
    ? "kph"
    : /\[m\/s\]|m\/s|metrespersecond/.test(hj)
      ? "m/s"
      : "mph";
  return { distanceUnit, speedUnit };
}

/* ------------------------------- main parse ------------------------------ */
export function parseGarminCsv(text: string): ParseResult {
  const errors: string[] = [];
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return {
      shots: [],
      headers: [],
      mappedFields: {},
      unmappedHeaders: [],
      distanceUnit: "yds",
      speedUnit: "mph",
      dateGuess: null,
      errors: ["The file appears to be empty."],
    };
  }

  // Find the header row: among the first few rows, the one that maps the most
  // canonical fields (handles optional metadata/preamble lines).
  let headerIdx = 0;
  let bestScore = -1;
  for (let r = 0; r < Math.min(6, rows.length); r++) {
    const score = rows[r].reduce(
      (acc, h) => acc + (SYNONYMS[norm(h)] ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      headerIdx = r;
    }
  }
  if (bestScore < 2) {
    errors.push(
      "Couldn't confidently find a header row with known Garmin columns (e.g. Club, Carry, Ball Speed). Parsing the first row as headers."
    );
    headerIdx = 0;
  }

  const headers = rows[headerIdx].map((h) => h.trim());
  const colField = headers.map((h) => SYNONYMS[norm(h)] ?? null);

  const mappedFields: Record<string, string> = {};
  headers.forEach((h, i) => {
    const f = colField[i];
    if (f && !(f in mappedFields)) mappedFields[f] = h;
  });
  const unmappedHeaders = headers.filter(
    (h, i) => !colField[i] && h.trim() !== ""
  );

  // Garmin puts a units row (e.g. "[mph],[deg],[Yards]") directly under the
  // header — use it to detect units, and skip it as a shot below.
  const unitsRow =
    rows[headerIdx + 1] && isUnitsRow(rows[headerIdx + 1])
      ? rows[headerIdx + 1]
      : [];
  const { distanceUnit, speedUnit } = detectUnits([...headers, ...unitsRow]);

  const shots: ParsedShot[] = [];
  const dateCounts = new Map<string, number>();

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const cells = rows[r];
    // skip a repeated header line or the "[mph],[deg],…" units line
    if (cells.map((c) => norm(c)).filter((c) => SYNONYMS[c]).length >= 3)
      continue;
    if (isUnitsRow(cells)) continue;

    const shot = emptyShot();
    const raw: Record<string, string> = {};
    const timeParts: string[] = [];
    let hasNumber = false;
    let clubProvided = false;

    headers.forEach((h, i) => {
      const value = (cells[i] ?? "").trim();
      if (value !== "") raw[h] = value;
      const field = colField[i];
      if (!field || value === "") return;
      if (field === "club") {
        shot.club = value;
        clubProvided = true;
      } else if (field === "shot_index") {
        const n = num(value);
        shot.shot_index = n != null ? Math.round(n) : null;
      } else if (field === "shot_time") {
        timeParts.push(value);
      } else if (field === "note") {
        shot.note = shot.note ? `${shot.note} ${value}` : value;
      } else if (NUMERIC_FIELDS.has(field)) {
        const parsed = num(value);
        (shot as unknown as Record<string, number | null>)[field] = parsed;
        if (parsed != null) hasNumber = true;
      }
    });

    // Drop rows with no real measurement (units line, blank/garbage rows).
    if (!hasNumber && !clubProvided) continue;

    if (timeParts.length) {
      shot.shot_time = parseDate(timeParts.join(" "));
      if (shot.shot_time) {
        const day = shot.shot_time.slice(0, 10);
        dateCounts.set(day, (dateCounts.get(day) ?? 0) + 1);
      }
    }

    const { label, category } = normalizeClub(shot.club);
    shot.club = label;
    shot.club_category = category;
    shot.shot_index = shot.shot_index ?? shots.length + 1;
    shot.raw = Object.keys(raw).length ? raw : null;
    shots.push(shot);
  }

  if (shots.length === 0)
    errors.push("No shot rows were found after the header.");

  // most common shot date
  let dateGuess: string | null = null;
  let topCount = 0;
  for (const [day, count] of dateCounts) {
    if (count > topCount) {
      topCount = count;
      dateGuess = day;
    }
  }

  return {
    shots,
    headers,
    mappedFields,
    unmappedHeaders,
    distanceUnit,
    speedUnit,
    dateGuess,
    errors,
  };
}

/** Pull a YYYY-MM-DD out of a Garmin filename like "DrivingRange-2026-06-19 …". */
export function dateFromFilename(name: string): string | null {
  const m = name.match(/(\d{4})[-_/](\d{2})[-_/](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
