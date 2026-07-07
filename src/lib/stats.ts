import type { Shot, ShotMetric, ClubCategory, GolfRound } from "./types";
import { clubRank, categoryOf } from "./clubs";

/** Rough handicap estimate from logged rounds. We only store score + par (no
 *  course rating / slope), so a true WHS index isn't possible · this uses
 *  (score − par) as the differential and averages the best few of the last 20
 *  rounds, mirroring the WHS "lowest N" table. Surface it as an *estimate*. */
export function estimateHandicap(rounds: GolfRound[]): {
  hcp: number | null;
  avgScore: number | null;
  n: number;
} {
  const scored = rounds
    .filter((r) => r.score != null)
    .slice()
    .sort((a, b) => (a.played_on < b.played_on ? 1 : -1)); // newest first
  const n = scored.length;
  const avgScore = n
    ? scored.reduce((s, r) => s + (r.score as number), 0) / n
    : null;
  if (n < 3) return { hcp: null, avgScore, n };
  const last20 = scored.slice(0, 20);
  const m = last20.length;
  const use =
    m <= 5 ? 1 : m === 6 ? 2 : m <= 8 ? 2 : m <= 11 ? 3 : m <= 14 ? 4 : m <= 16 ? 5 : m <= 18 ? 6 : m === 19 ? 7 : 8;
  const diffs = last20
    .map((r) => (r.score as number) - (r.par ?? 72))
    .sort((a, b) => a - b);
  const best = diffs.slice(0, use);
  const hcp = best.reduce((s, d) => s + d, 0) / best.length;
  return { hcp, avgScore, n };
}

/** Round-level scoring averages + handicap-appropriate "ideal" targets.
 *  Targets scale with the player's level so the comparison is realistic for a
 *  high-handicapper, not a tour pro. */
export function scoringSummary(rounds: GolfRound[]): {
  hcp: number | null;
  avgScore: number | null;
  n: number;
  avgPutts: number | null;
  avgFairways: number | null;
  avgGir: number | null;
  ideal: { putts: number; fairways: number; gir: number };
} {
  const { hcp, avgScore, n } = estimateHandicap(rounds);
  const avg = (key: "putts" | "fairways_hit" | "greens_in_regulation") => {
    const xs = rounds
      .map((r) => r[key])
      .filter((v): v is number => v != null && Number.isFinite(v));
    return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
  };
  // Reference level: estimated hcp, else avg strokes over par, else the 85 goal (~13).
  const refHcp = hcp ?? (avgScore != null ? Math.max(0, avgScore - 72) : 13);
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const ideal = {
    putts: Math.round(clamp(30 + refHcp * 0.3, 28, 40)),
    fairways: Math.round(clamp(10 - refHcp * 0.18, 2, 13)),
    gir: Math.round(clamp(13 - refHcp * 0.45, 1, 14)),
  };
  return {
    hcp,
    avgScore,
    n,
    avgPutts: avg("putts"),
    avgFairways: avg("fairways_hit"),
    avgGir: avg("greens_in_regulation"),
    ideal,
  };
}

export interface Stat {
  n: number;
  mean: number;
  std: number;
  min: number;
  max: number;
}

export const EMPTY_STAT: Stat = { n: 0, mean: NaN, std: NaN, min: NaN, max: NaN };

export function statOf(values: (number | null | undefined)[]): Stat {
  const xs = values.filter(
    (v): v is number => v != null && Number.isFinite(v)
  );
  const n = xs.length;
  if (n === 0) return EMPTY_STAT;
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const variance =
    n > 1 ? xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1) : 0;
  let min = xs[0];
  let max = xs[0];
  for (const x of xs) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { n, mean, std: Math.sqrt(variance), min, max };
}

const col = (shots: Shot[], key: ShotMetric) => shots.map((s) => s[key]);

/** Ideal smash factor (ball speed / club speed) by club type · contact quality. */
export const SMASH_IDEAL: Record<ClubCategory, number> = {
  Driver: 1.49,
  Wood: 1.48,
  Hybrid: 1.45,
  Iron: 1.38,
  Wedge: 1.25,
  Putter: 1.0,
  Other: 1.4,
};

// A "mishit" (top/duff/chunk) carries far shorter than normal and skews every
// stat. Flag shots whose carry is below MISS_THRESHOLD × the club's median carry
// and drop them from the analysis, reported separately as a miss rate. Median
// (not mean) so the mishits themselves don't move the cutoff. Skip the check
// when a club has too few shots · the median would be too noisy to trust.
// ponytail: fixed % + min-N; expose as constants so they're tunable later.
export const MISS_THRESHOLD = 0.7;
export const MIN_SHOTS_FOR_MISS = 5;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Split a single club's shots into clean vs mishit by carry distance.
 *  Shots without a carry value are dropped entirely (can't classify). */
export function splitMisses(shots: Shot[]): {
  clean: Shot[];
  missCount: number;
  missRate: number; // % of carry-bearing shots flagged, NaN if not enough data
} {
  const withCarry = shots.filter(
    (s) => s.carry_distance != null && Number.isFinite(s.carry_distance)
  );
  if (withCarry.length < MIN_SHOTS_FOR_MISS)
    return { clean: withCarry, missCount: 0, missRate: NaN };
  const cutoff =
    median(withCarry.map((s) => s.carry_distance as number)) * MISS_THRESHOLD;
  const clean: Shot[] = [];
  let missCount = 0;
  for (const s of withCarry) {
    if ((s.carry_distance as number) < cutoff) missCount++;
    else clean.push(s);
  }
  return { clean, missCount, missRate: (missCount / withCarry.length) * 100 };
}

/** Clean shots across all clubs · mishits/warm-ups dropped per-club. */
export function cleanShots(shots: Shot[]): Shot[] {
  const groups = new Map<string, Shot[]>();
  for (const s of shots) {
    const k = s.club ?? "Unknown";
    const g = groups.get(k);
    if (g) g.push(s);
    else groups.set(k, [s]);
  }
  return [...groups.values()].flatMap((g) => splitMisses(g).clean);
}

export interface ClubAgg {
  club: string;
  category: ClubCategory;
  count: number;
  missCount: number;
  missRate: number; // % of shots that were mishits, NaN if not enough data
  carry: Stat;
  total: Stat;
  ball: Stat;
  clubSpeed: Stat;
  smash: Stat;
  launch: Stat;
  launchDir: Stat;
  spin: Stat;
  backspin: Stat;
  sideSpin: Stat;
  clubPath: Stat;
  face: Stat;
  faceToPath: Stat;
  attackAngle: Stat; // + = up, − = down
  spinAxis: Stat; // tilt of spin (+R / −L) → curve direction
  lateral: Stat; // carry offline (+R/-L), falls back to total offline
  apex: Stat;
  longestCarry: number;
  smashIdeal: number;
  consistency: number; // carry coefficient of variation (%), lower = tighter
}

export function aggregateByClub(shots: Shot[]): ClubAgg[] {
  const groups = new Map<string, Shot[]>();
  for (const s of shots) {
    const key = s.club ?? "Unknown";
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }

  const aggs: ClubAgg[] = [];
  for (const [club, all] of groups) {
    const { clean: gs, missCount, missRate } = splitMisses(all);
    const carry = statOf(col(gs, "carry_distance"));
    let lateral = statOf(col(gs, "carry_deviation_distance"));
    if (lateral.n === 0) lateral = statOf(col(gs, "total_deviation_distance"));
    const category = (gs[0] ?? all[0]).club_category ?? categoryOf(club);
    const consistency =
      carry.n > 1 && carry.mean > 0 ? (carry.std / carry.mean) * 100 : NaN;

    aggs.push({
      club,
      category,
      count: gs.length,
      missCount,
      missRate,
      carry,
      total: statOf(col(gs, "total_distance")),
      ball: statOf(col(gs, "ball_speed")),
      clubSpeed: statOf(col(gs, "club_speed")),
      smash: statOf(col(gs, "smash_factor")),
      launch: statOf(col(gs, "launch_angle")),
      launchDir: statOf(col(gs, "launch_direction")),
      spin: statOf(col(gs, "spin_rate")),
      backspin: statOf(col(gs, "backspin")),
      sideSpin: statOf(col(gs, "sidespin")),
      clubPath: statOf(col(gs, "club_path")),
      face: statOf(col(gs, "club_face")),
      faceToPath: statOf(col(gs, "face_to_path")),
      attackAngle: statOf(col(gs, "attack_angle")),
      spinAxis: statOf(col(gs, "spin_axis")),
      lateral,
      apex: statOf(col(gs, "apex_height")),
      longestCarry: carry.n ? carry.max : NaN,
      smashIdeal: SMASH_IDEAL[category],
      consistency,
    });
  }

  return aggs
    .filter((a) => a.count > 0) // skip clubs with no carry data to analyze
    .sort((a, b) => clubRank(a.club) - clubRank(b.club));
}

export interface Kpis {
  shots: number;
  clubs: number;
  longestCarry: { value: number; club: string } | null;
  avgSmash: number;
  avgBall: number;
}

export function overallKpis(shots: Shot[]): Kpis {
  const groups = new Map<string, Shot[]>();
  for (const s of shots) {
    const key = s.club ?? "Unknown";
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }
  // Same mishit rule as ClubTable/Analyze so KPI numbers match those pages.
  const clean = [...groups.values()].flatMap((g) => splitMisses(g).clean);
  let longest: { value: number; club: string } | null = null;
  for (const s of clean) {
    if (s.carry_distance != null && Number.isFinite(s.carry_distance)) {
      if (!longest || s.carry_distance > longest.value)
        longest = { value: s.carry_distance, club: s.club ?? "—" };
    }
  }
  return {
    shots: shots.length, // total logged, incl. mishits · it's a volume metric
    clubs: groups.size,
    longestCarry: longest,
    avgSmash: statOf(col(clean, "smash_factor")).mean,
    avgBall: statOf(col(clean, "ball_speed")).mean,
  };
}

/* ------------------------------ dispersion ------------------------------- */
export interface DispersionPoint {
  x: number; // lateral offline (+R / -L)
  y: number; // carry distance
}
export interface Dispersion {
  points: DispersionPoint[];
  centroidX: number;
  centroidY: number;
  sdX: number;
  sdY: number;
  carry: Stat;
  lateral: Stat;
}

export function dispersionFor(shots: Shot[]): Dispersion {
  const points: DispersionPoint[] = [];
  for (const s of shots) {
    const x = s.carry_deviation_distance ?? s.total_deviation_distance;
    const y = s.carry_distance;
    if (x != null && Number.isFinite(x) && y != null && Number.isFinite(y))
      points.push({ x, y });
  }
  const carry = statOf(points.map((p) => p.y));
  const lateral = statOf(points.map((p) => p.x));
  return {
    points,
    centroidX: lateral.n ? lateral.mean : 0,
    centroidY: carry.n ? carry.mean : 0,
    sdX: lateral.n ? lateral.std : 0,
    sdY: carry.n ? carry.std : 0,
    carry,
    lateral,
  };
}

/* ----------------------------- trend / time ------------------------------ */
export interface SessionShots {
  id: string;
  date: string; // YYYY-MM-DD
  shots: Shot[];
}
export interface TrendPoint {
  date: string;
  value: number;
  n: number;
}

function clubFilter(shots: Shot[], club?: string): Shot[] {
  return club ? shots.filter((s) => s.club === club) : shots;
}

/** Per-session mean of a metric (chronological). Sessions with no data dropped. */
export function metricTrend(
  data: SessionShots[],
  metric: ShotMetric,
  club?: string
): TrendPoint[] {
  return data
    .map((d) => {
      const st = statOf(col(clubFilter(d.shots, club), metric));
      return { date: d.date, value: st.mean, n: st.n };
    })
    .filter((p) => p.n > 0 && Number.isFinite(p.value));
}

/** Per-session dispersion (std dev of carry) · lower is more consistent. */
export function consistencyTrend(
  data: SessionShots[],
  club?: string
): TrendPoint[] {
  return data
    .map((d) => {
      const st = statOf(col(clubFilter(d.shots, club), "carry_distance"));
      return { date: d.date, value: st.std, n: st.n };
    })
    .filter((p) => p.n > 1 && Number.isFinite(p.value));
}

/** Simple least-squares slope of y over index · sign tells trend direction. */
export function slope(points: { value: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const xs = points.map((_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = points.reduce((s, p) => s + p.value, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (points[i].value - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/* ---------------------------- shot shape / tendency ---------------------- */
export type Tone = "good" | "warn" | "bad" | "info";
export interface Tendency {
  label: string; // EN golf jargon, never translated
  detail: { en: string; th: string };
  tone: Tone;
}

/* Standard launch-monitor 9-window shape taxonomy (right-handed golfer):
 * start line (launch_direction, +R/−L deg) × curvature (spin_axis deg,
 * falling back to sidespin ≈100 rpm/deg, then face-to-path).
 * Tones: back-to-target shapes = good, straight-line offline = warn,
 * strong curves = bad. */
export const SHAPE_INFO = {
  "Pull Hook": { tone: "bad", en: "Starts left, curves harder left", th: "ออกซ้ายแล้วโค้งซ้ายเพิ่ม" },
  "Pull Draw": { tone: "warn", en: "Starts left, drifts further left", th: "ออกซ้าย โค้งซ้ายเล็กน้อย" },
  Pull: { tone: "warn", en: "Straight flight, left of target", th: "ลูกตรงแต่ออกซ้ายทั้งลูก" },
  "Pull Fade": { tone: "good", en: "Starts left, falls back to target", th: "ออกซ้ายแล้วโค้งกลับเข้าเป้า" },
  "Pull Slice": { tone: "warn", en: "Starts left, curves well right", th: "ออกซ้ายแล้วโค้งขวาแรง" },
  Hook: { tone: "bad", en: "Strong right-to-left curve", th: "โค้งซ้ายแรง" },
  Draw: { tone: "good", en: "Gentle right-to-left", th: "โค้งซ้ายเล็กน้อย (ทรงสวย)" },
  Straight: { tone: "good", en: "Tight, on-line pattern", th: "ตรงแนวเป้า" },
  Fade: { tone: "good", en: "Gentle left-to-right", th: "โค้งขวาเล็กน้อย (ทรงสวย)" },
  Slice: { tone: "bad", en: "Strong left-to-right curve", th: "โค้งขวาแรง" },
  "Push Draw": { tone: "good", en: "Starts right, draws back to target", th: "ออกขวาแล้วโค้งกลับเข้าเป้า" },
  Push: { tone: "warn", en: "Straight flight, right of target", th: "ลูกตรงแต่ออกขวาทั้งลูก" },
  "Push Fade": { tone: "warn", en: "Starts right, drifts further right", th: "ออกขวา โค้งขวาเล็กน้อย" },
  "Push Slice": { tone: "bad", en: "Starts right, curves harder right", th: "ออกขวาแล้วโค้งขวาเพิ่ม" },
} as const;
export type ShapeLabel = keyof typeof SHAPE_INFO;

const START_DEG = 2; // |launch dir| beyond this = pull/push
const CURVE_DEG = 2; // |curve| beyond this = draw/fade
const STRONG_DEG = 8; // …beyond this = hook/slice

/** Map start line + curvature (deg, +R/−L) onto the 9-window matrix. */
export function classifyShape(start: number, curve: number): ShapeLabel | null {
  const s = Number.isFinite(start) ? start : 0;
  const c = Number.isFinite(curve) ? curve : 0;
  if (!Number.isFinite(start) && !Number.isFinite(curve)) return null;
  const sd = s <= -START_DEG ? "L" : s >= START_DEG ? "R" : "C";
  if (c <= -CURVE_DEG) {
    const strong = c <= -STRONG_DEG;
    if (sd === "L") return strong ? "Pull Hook" : "Pull Draw";
    if (sd === "R") return strong ? "Hook" : "Push Draw";
    return strong ? "Hook" : "Draw";
  }
  if (c >= CURVE_DEG) {
    const strong = c >= STRONG_DEG;
    if (sd === "L") return strong ? "Pull Slice" : "Pull Fade";
    if (sd === "R") return strong ? "Push Slice" : "Push Fade";
    return strong ? "Slice" : "Fade";
  }
  return sd === "L" ? "Pull" : sd === "R" ? "Push" : "Straight";
}

/** Per-shot curvature in degree-equivalents: spin axis → sidespin → face-to-path. */
const curveOf = (s: Shot): number =>
  s.spin_axis ??
  (s.sidespin != null ? s.sidespin / 100 : (s.face_to_path ?? NaN));

export interface ShapeCount {
  label: ShapeLabel;
  n: number;
  pct: number;
  tone: Tone;
}

/** How often each shape shows up for these shots (desc). One club hits many
 *  shapes · the mix tells more than a single average label. */
export function shapeBreakdown(shots: Shot[]): ShapeCount[] {
  const counts = new Map<ShapeLabel, number>();
  let total = 0;
  for (const s of shots) {
    const label = classifyShape(s.launch_direction ?? NaN, curveOf(s));
    if (!label) continue;
    total++;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, n]) => ({
      label,
      n,
      pct: (n / total) * 100,
      tone: SHAPE_INFO[label].tone as Tone,
    }))
    .sort((a, b) => b.n - a.n);
}

/** A club's typical shape from its average start line + curvature. */
export function shotShape(agg: ClubAgg): Tendency {
  const start = agg.launchDir.n ? agg.launchDir.mean : NaN;
  const curve = agg.spinAxis.n
    ? agg.spinAxis.mean
    : agg.sideSpin.n
      ? agg.sideSpin.mean / 100
      : agg.faceToPath.n
        ? agg.faceToPath.mean
        : NaN;

  let label = classifyShape(start, curve);

  // Legacy fallback: only lateral landing bias available (older imports).
  if (!label && agg.lateral.n && agg.carry.n && agg.carry.mean > 0) {
    const offlinePct = (agg.lateral.mean / agg.carry.mean) * 100; // +R/−L
    label = classifyShape(0, offlinePct / 2);
  }
  if (!label)
    return {
      label: "—",
      detail: { en: "Not enough data", th: "ข้อมูลยังไม่พอ" },
      tone: "info",
    };
  const s = SHAPE_INFO[label];
  return { label, detail: { en: s.en, th: s.th }, tone: s.tone as Tone };
}

/** Short, preliminary "what to adjust" tips for one club · pure logic, no AI. */
export function clubTips(agg: ClubAgg): { text: string; th: string }[] {
  const tips: { text: string; th: string }[] = [];
  if (agg.smash.n && agg.smash.mean < agg.smashIdeal - 0.08)
    tips.push({
      text: `Contact is off-centre (smash ${agg.smash.mean.toFixed(2)} vs ideal ~${agg.smashIdeal.toFixed(2)}). Groove a centre strike before chasing distance.`,
      th: `โดนไม่กลางหน้าไม้ (smash ${agg.smash.mean.toFixed(2)} เทียบ ideal ~${agg.smashIdeal.toFixed(2)}) · ฝึกตีให้โดนกลางก่อนค่อยเพิ่มระยะ`,
    });
  if (agg.face.n && agg.face.mean < -3)
    tips.push({
      text: `Face ~${Math.abs(agg.face.mean).toFixed(0)}° closed at impact → aims left. Check grip; feel the toe stay back through impact.`,
      th: `หน้าไม้ปิด ~${Math.abs(agg.face.mean).toFixed(0)}° ตอนปะทะ → เล็งซ้าย เช็คกริปและคุมไม่ให้พลิกหน้าไม้`,
    });
  else if (agg.face.n && agg.face.mean > 3)
    tips.push({
      text: `Face ~${agg.face.mean.toFixed(0)}° open → aims right. Rotate/release the face more through impact.`,
      th: `หน้าไม้เปิด ~${agg.face.mean.toFixed(0)}° → เล็งขวา ปล่อย/พลิกหน้าไม้ให้มากขึ้นตอนปะทะ`,
    });
  if (agg.clubPath.n && agg.clubPath.mean < -2)
    tips.push({
      text: `Path ${Math.abs(agg.clubPath.mean).toFixed(1)}° out-to-in (over the top). Feel more in-to-out and shallow the downswing.`,
      th: `วงเข้า-ออก ${Math.abs(agg.clubPath.mean).toFixed(1)}° (over the top) · ฝึกฟีล in-to-out และ shallow ขาลง`,
    });
  else if (agg.clubPath.n && agg.clubPath.mean > 4)
    tips.push({
      text: `Path ${agg.clubPath.mean.toFixed(1)}° in-to-out (very pushy). Calm the path toward neutral.`,
      th: `วงออก-เข้า ${agg.clubPath.mean.toFixed(1)}° (in-to-out มากไป) · ปรับ path ให้กลางขึ้น`,
    });
  if (Number.isFinite(agg.consistency) && agg.consistency > 15)
    tips.push({
      text: `Carry spread is wide (CV ${agg.consistency.toFixed(0)}%). Build a repeatable strike before adding speed.`,
      th: `ระยะ carry เหวี่ยงกว้าง (CV ${agg.consistency.toFixed(0)}%) · ทำให้นิ่งก่อนค่อยเพิ่มสปีด`,
    });
  if (agg.category === "Driver" && agg.launch.n && agg.launch.mean > 17)
    tips.push({
      text: `Driver launch ${agg.launch.mean.toFixed(0)}° is high · likely scooping/skying. Tee lower, ball forward, centre the strike.`,
      th: `ไดรเวอร์ launch ${agg.launch.mean.toFixed(0)}° สูงไป · น่าจะงัด/ลอยตั้ง ตั้งทีต่ำลง ลูกไปข้างหน้า เน้นโดนกลาง`,
    });
  if (tips.length === 0)
    tips.push({
      text: "Solid and repeatable · keep grooving this one.",
      th: "ตีได้ดีและสม่ำเสมอ · รักษาความรู้สึกนี้ไว้",
    });
  return tips.slice(0, 3);
}

/** Bag-wide priorities, ranked. Returns short tip + tone. */
export function bagTips(
  aggs: ClubAgg[]
): { text: string; th: string; tone: Tone }[] {
  const out: { text: string; th: string; tone: Tone }[] = [];
  const withFace = aggs.filter((a) => a.face.n);
  const faceAvg = withFace.length
    ? withFace.reduce((s, a) => s + a.face.mean, 0) / withFace.length
    : NaN;
  const withPath = aggs.filter((a) => a.clubPath.n);
  const pathAvg = withPath.length
    ? withPath.reduce((s, a) => s + a.clubPath.mean, 0) / withPath.length
    : NaN;

  if (Number.isFinite(faceAvg) && faceAvg < -3)
    out.push({
      text: `Clubface is closed across the bag (~${Math.abs(faceAvg).toFixed(0)}°) · a left-miss/hook bias. Fix grip & face awareness first; it's the biggest lever.`,
      th: `หน้าไม้ปิดเฉลี่ยทั้งถุง (~${Math.abs(faceAvg).toFixed(0)}°) มีแนวโน้มพลาดซ้าย/hook · แก้กริปและการคุมหน้าไม้ก่อน เป็นจุดที่ได้ผลมากสุด`,
      tone: "bad",
    });
  if (Number.isFinite(pathAvg) && pathAvg < -2)
    out.push({
      text: `You swing out-to-in / over the top (~${Math.abs(pathAvg).toFixed(1)}°). Train an in-to-out feel and shallow the club.`,
      th: `วงสวิงเข้า-ออก (out-to-in / over the top ~${Math.abs(pathAvg).toFixed(1)}°) · ฝึกฟีลลิ่ง in-to-out และ shallow ไม้ลงมา`,
      tone: "warn",
    });

  const worst = aggs
    .filter((a) => a.smash.n)
    .sort((a, b) => a.smash.mean - a.smashIdeal - (b.smash.mean - b.smashIdeal))[0];
  if (worst && worst.smash.mean < worst.smashIdeal - 0.08)
    out.push({
      text: `${worst.club} has your weakest contact (smash ${worst.smash.mean.toFixed(2)}). Centre-strike work here pays off most.`,
      th: `${worst.club} โดนหน้าไม้แย่สุด (smash ${worst.smash.mean.toFixed(2)}) · ฝึกตีให้โดนกลางหน้าไม้ที่ไม้นี้คุ้มสุด`,
      tone: "bad",
    });

  const loose = aggs
    .filter((a) => Number.isFinite(a.consistency))
    .sort((a, b) => b.consistency - a.consistency)[0];
  if (loose && loose.consistency > 20)
    out.push({
      text: `${loose.club} is least consistent (CV ${loose.consistency.toFixed(0)}%). Make it reliable or leave it in the bag on course.`,
      th: `${loose.club} นิ่งน้อยสุด (CV ${loose.consistency.toFixed(0)}%) · ทำให้สม่ำเสมอ หรือเก็บไว้ในถุงตอนออกรอบ`,
      tone: "warn",
    });

  const best = aggs
    .filter((a) => a.smash.n)
    .sort((a, b) => b.smash.mean - b.smashIdeal - (a.smash.mean - a.smashIdeal))[0];
  if (best && best.smash.mean >= best.smashIdeal - 0.03)
    out.push({
      text: `${best.club} is your most solid club · build your scoring strategy around it.`,
      th: `${best.club} คือไม้ที่มั่นใจสุด · วางแผนทำสกอร์โดยอิงไม้นี้`,
      tone: "good",
    });

  if (out.length === 0)
    out.push({
      text: "Import a few more sessions to unlock tailored recommendations.",
      th: "อัปข้อมูลซ้อมเพิ่มอีกหน่อย เพื่อปลดล็อกคำแนะนำเฉพาะตัว",
      tone: "info",
    });
  return out.slice(0, 4);
}

/** Contact-quality verdict from smash factor vs the ideal for that club type. */
export function contactQuality(agg: ClubAgg): Tendency {
  if (!agg.smash.n)
    return {
      label: "—",
      detail: { en: "No smash data", th: "ไม่มีข้อมูล smash" },
      tone: "info",
    };
  const diff = agg.smash.mean - agg.smashIdeal;
  if (diff >= -0.03)
    return {
      label: "Solid",
      detail: { en: "Centered strike", th: "โดนกลางหน้าไม้" },
      tone: "good",
    };
  if (diff >= -0.08)
    return {
      label: "Decent",
      detail: { en: "Slightly off-center", th: "เยื้องจากกลางหน้าไม้เล็กน้อย" },
      tone: "warn",
    };
  return {
    label: "Thin / toe-heel",
    detail: { en: "Poor contact", th: "โดนไม่เต็มหน้าไม้" },
    tone: "bad",
  };
}

/**
 * Strike verdict from attack angle + smash. Driver wants +AoA (hit up);
 * everything off the turf wants ≤0 (ball-first). Flags "ตีหลังลูก" when the
 * club comes in level/up AND smash is down · a fat/thin signature.
 */
export function strikeVerdict(agg: ClubAgg): Tendency {
  const aoa = agg.attackAngle.n ? agg.attackAngle.mean : NaN;
  if (!Number.isFinite(aoa))
    return {
      label: "—",
      detail: { en: "No attack angle data", th: "ไม่มีข้อมูล attack angle" },
      tone: "info",
    };
  if (agg.category === "Driver")
    return aoa < 0
      ? {
          label: "Hitting down",
          detail: {
            en: "Hitting down with driver · try hitting up (+) for more distance",
            th: "ตีลงใส่ไดรเวอร์ · ลองตีขึ้น (+) เพิ่มระยะ",
          },
          tone: "warn",
        }
      : {
          label: "Hitting up",
          detail: {
            en: "Hitting up · correct for driver",
            th: "ตีขึ้นถูกต้องสำหรับไดรเวอร์",
          },
          tone: "good",
        };
  const smashOff = agg.smash.n ? agg.smash.mean - agg.smashIdeal : NaN;
  if (aoa >= 0 && Number.isFinite(smashOff) && smashOff < -0.08)
    return {
      label: "Hitting behind?",
      detail: {
        en: "Level/upward strike + weak contact · likely hitting behind the ball or thinning it",
        th: "วงเข้าระดับ/ขึ้น + โดนไม่เต็ม · อาจตีหลังลูก/ปาดบาง",
      },
      tone: "bad",
    };
  if (aoa >= 1)
    return {
      label: "Catching up",
      detail: {
        en: "Hitting up with irons · strike down, ball first",
        th: "ตีขึ้นกับเหล็ก · กดลงโดนลูกก่อนดิน",
      },
      tone: "warn",
    };
  return {
    label: "Ball-first",
    detail: { en: "Ball-first, hitting down (good)", th: "ตีลงโดนลูกก่อนดิน (ดี)" },
    tone: "good",
  };
}

/* ============ practice tools: caddy · scoring zones · fatigue · benchmark ==
   Pure helpers consumed by the practice UI. All distance values are in the
   session's own unit (yds or m) · callers pass the label for display.        */

/** Carry you reach ~75% of the time (mean − 0.5σ) · the number to actually
 *  club off, not your best-ever carry. */
export function reliableCarry(agg: ClubAgg): number {
  return agg.carry.n ? agg.carry.mean - 0.5 * agg.carry.std : NaN;
}

export interface ClubPick {
  club: string;
  category: ClubCategory;
  reliable: number; // reliable carry
  mean: number; // average carry
  diff: number; // reliable − target (− short of target, + past it)
}

/** "What do I hit from X?" · clubs ranked by how close their reliable carry is
 *  to the target distance (nearest first). */
export function clubForDistance(aggs: ClubAgg[], target: number): ClubPick[] {
  return aggs
    .map((a) => {
      const reliable = reliableCarry(a);
      return {
        club: a.club,
        category: a.category,
        reliable,
        mean: a.carry.mean,
        diff: reliable - target,
      };
    })
    .filter((p) => Number.isFinite(p.reliable))
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
}

/** p-th percentile (0–100) via linear interpolation. */
export function percentile(values: number[], p: number): number {
  const xs = values
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!xs.length) return NaN;
  const i = (p / 100) * (xs.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? xs[lo] : xs[lo] + (xs[hi] - xs[lo]) * (i - lo);
}

export interface CarryBand {
  club: string;
  category: ClubCategory;
  n: number;
  p25: number;
  p50: number; // median
  p75: number;
}

/** Per-club carry spread (P25 / median / P75) on clean shots · the working
 *  range for distance control, and how you spot yardage gaps in the bag. */
export function carryBands(shots: Shot[]): CarryBand[] {
  const byClub = new Map<string, Shot[]>();
  for (const s of shots) {
    const k = s.club ?? "Unknown";
    const g = byClub.get(k);
    if (g) g.push(s);
    else byClub.set(k, [s]);
  }
  const out: CarryBand[] = [];
  for (const [club, gs] of byClub) {
    const xs = splitMisses(gs)
      .clean.map((s) => s.carry_distance)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (!xs.length) continue;
    out.push({
      club,
      category: categoryOf(club),
      n: xs.length,
      p25: percentile(xs, 25),
      p50: percentile(xs, 50),
      p75: percentile(xs, 75),
    });
  }
  return out.sort((a, b) => clubRank(a.club) - clubRank(b.club));
}

export interface FatiguePoint {
  order: number; // 1-based shot order within the session
  smash: number | null;
  carryIdx: number | null; // carry as % of that club's session mean (100 = normal)
}

/** Within one session: does contact/carry fade as you tire? Each shot's carry
 *  is normalised to its club's session mean so a mixed bag still yields one
 *  fatigue line; smash is the club-independent contact signal. */
export function fatigueCurve(shots: Shot[]): FatiguePoint[] {
  const byClub = new Map<string, Shot[]>();
  for (const s of shots) {
    const k = s.club ?? "Unknown";
    const g = byClub.get(k);
    if (g) g.push(s);
    else byClub.set(k, [s]);
  }
  const meanByClub = new Map<string, number>();
  for (const [club, gs] of byClub) {
    const st = statOf(splitMisses(gs).clean.map((s) => s.carry_distance));
    if (st.n) meanByClub.set(club, st.mean);
  }
  return [...shots]
    .sort((a, b) => (a.shot_index ?? 0) - (b.shot_index ?? 0))
    .map((s, i) => {
      const cm = meanByClub.get(s.club ?? "Unknown");
      const carryIdx =
        cm && cm > 0 && s.carry_distance != null && Number.isFinite(s.carry_distance)
          ? (s.carry_distance / cm) * 100
          : null;
      return {
        order: i + 1,
        smash:
          s.smash_factor != null && Number.isFinite(s.smash_factor)
            ? s.smash_factor
            : null,
        carryIdx,
      };
    });
}

export interface ClubBenchmark {
  b90: number; // typical carry (yds) for someone breaking 90
  b80: number; // typical carry (yds) for someone breaking 80
}

/** Per-club carry benchmarks (yards) by skill level · finer than the coarse
 *  per-category IDEAL so a 4i and 9i aren't judged against the same number.
 *  Approximate amateur averages; treat as a guide, not a verdict. */
export const CLUB_BENCHMARK: Record<string, ClubBenchmark> = {
  Driver: { b90: 200, b80: 245 },
  "3 Wood": { b90: 190, b80: 225 },
  "5 Wood": { b90: 180, b80: 210 },
  "7 Wood": { b90: 170, b80: 200 },
  "3 Hybrid": { b90: 175, b80: 205 },
  "4 Hybrid": { b90: 165, b80: 195 },
  "5 Hybrid": { b90: 158, b80: 185 },
  "3 Iron": { b90: 170, b80: 200 },
  "4 Iron": { b90: 160, b80: 190 },
  "5 Iron": { b90: 150, b80: 178 },
  "6 Iron": { b90: 140, b80: 165 },
  "7 Iron": { b90: 130, b80: 152 },
  "8 Iron": { b90: 120, b80: 140 },
  "9 Iron": { b90: 110, b80: 128 },
  PW: { b90: 100, b80: 118 },
  GW: { b90: 88, b80: 103 },
  SW: { b90: 72, b80: 88 },
  LW: { b90: 58, b80: 72 },
};

export function benchmarkForClub(club: string): ClubBenchmark | null {
  return CLUB_BENCHMARK[club] ?? null;
}

/** Ideal carry for the player's handicap, interpolated between the break-90
 *  (≈18 hcp) and break-80 (≈8 hcp) anchors. hcp clamped to 0–30 so the line
 *  isn't extrapolated into nonsense. */
export function idealCarryForHcp(club: string, hcp: number): number | null {
  const bm = benchmarkForClub(club);
  if (!bm || !Number.isFinite(hcp)) return null;
  const h = Math.max(0, Math.min(30, hcp));
  return Math.round(bm.b90 + ((18 - h) * (bm.b80 - bm.b90)) / 10);
}

/** Two-way miss: share of shots ≥8% of carry offline to each side. */
export function twoWayMiss(shots: Shot[]): {
  leftPct: number;
  rightPct: number;
  twoWay: boolean;
  n: number;
} {
  let left = 0;
  let right = 0;
  let n = 0;
  for (const s of shots) {
    const off = s.carry_deviation_distance ?? s.total_deviation_distance;
    const carry = s.carry_distance;
    if (off == null || !Number.isFinite(off)) continue;
    if (carry == null || !Number.isFinite(carry) || carry <= 0) continue;
    n++;
    const pct = (off / carry) * 100;
    if (pct <= -8) left++;
    else if (pct >= 8) right++;
  }
  const leftPct = n ? (left / n) * 100 : 0;
  const rightPct = n ? (right / n) * 100 : 0;
  return { leftPct, rightPct, twoWay: leftPct >= 25 && rightPct >= 25, n };
}
