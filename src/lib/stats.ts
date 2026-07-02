import type { Shot, ShotMetric, ClubCategory, GolfRound } from "./types";
import { clubRank, categoryOf } from "./clubs";

/** Rough handicap estimate from logged rounds. We only store score + par (no
 *  course rating / slope), so a true WHS index isn't possible — this uses
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

/** Ideal smash factor (ball speed / club speed) by club type — contact quality. */
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
// when a club has too few shots — the median would be too noisy to trust.
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
    shots: shots.length, // total logged, incl. mishits — it's a volume metric
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

/** Per-session dispersion (std dev of carry) — lower is more consistent. */
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

/** Simple least-squares slope of y over index — sign tells trend direction. */
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
  label: string;
  detail: string;
  tone: Tone;
}

/**
 * Classify a club's typical shot shape for a right-handed golfer using the
 * strongest available signal: spin axis → face-to-path → lateral bias.
 */
export function shotShape(agg: ClubAgg): Tendency {
  const carryMean = agg.carry.n ? agg.carry.mean : 0;
  const bias = agg.lateral.n ? agg.lateral.mean : NaN; // +R / -L (yds)
  const axis = agg.sideSpin.n
    ? agg.sideSpin.mean
    : agg.faceToPath.n
      ? agg.faceToPath.mean
      : NaN;

  // magnitude relative to carry: how offline on average
  const offlinePct =
    carryMean > 0 && Number.isFinite(bias)
      ? (Math.abs(bias) / carryMean) * 100
      : NaN;

  if (!Number.isFinite(bias) && !Number.isFinite(axis))
    return { label: "—", detail: "Not enough data", tone: "info" };

  const dir =
    Number.isFinite(bias) && Math.abs(bias) >= 0.05
      ? bias > 0
        ? "right"
        : "left"
      : Number.isFinite(axis) && Math.abs(axis) >= 0.05
        ? axis > 0
          ? "right"
          : "left"
        : "straight";

  const strong = Number.isFinite(offlinePct) ? offlinePct > 8 : false;

  if (dir === "straight" || (Number.isFinite(offlinePct) && offlinePct < 3))
    return { label: "Straight", detail: "Tight, on-line pattern", tone: "good" };

  if (dir === "right")
    return strong
      ? { label: "Slice / Push", detail: "Misses well right", tone: "bad" }
      : { label: "Fade", detail: "Gentle left-to-right", tone: "warn" };

  return strong
    ? { label: "Hook / Pull", detail: "Misses well left", tone: "bad" }
    : { label: "Draw", detail: "Gentle right-to-left", tone: "warn" };
}

/** Short, preliminary "what to adjust" tips for one club — pure logic, no AI. */
export function clubTips(agg: ClubAgg): { text: string; th: string }[] {
  const tips: { text: string; th: string }[] = [];
  if (agg.smash.n && agg.smash.mean < agg.smashIdeal - 0.08)
    tips.push({
      text: `Contact is off-centre (smash ${agg.smash.mean.toFixed(2)} vs ideal ~${agg.smashIdeal.toFixed(2)}). Groove a centre strike before chasing distance.`,
      th: `โดนไม่กลางหน้าไม้ (smash ${agg.smash.mean.toFixed(2)} เทียบ ideal ~${agg.smashIdeal.toFixed(2)}) — ฝึกตีให้โดนกลางก่อนค่อยเพิ่มระยะ`,
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
      th: `วงเข้า-ออก ${Math.abs(agg.clubPath.mean).toFixed(1)}° (over the top) — ฝึกฟีล in-to-out และ shallow ขาลง`,
    });
  else if (agg.clubPath.n && agg.clubPath.mean > 4)
    tips.push({
      text: `Path ${agg.clubPath.mean.toFixed(1)}° in-to-out (very pushy). Calm the path toward neutral.`,
      th: `วงออก-เข้า ${agg.clubPath.mean.toFixed(1)}° (in-to-out มากไป) — ปรับ path ให้กลางขึ้น`,
    });
  if (Number.isFinite(agg.consistency) && agg.consistency > 15)
    tips.push({
      text: `Carry spread is wide (CV ${agg.consistency.toFixed(0)}%). Build a repeatable strike before adding speed.`,
      th: `ระยะ carry เหวี่ยงกว้าง (CV ${agg.consistency.toFixed(0)}%) — ทำให้นิ่งก่อนค่อยเพิ่มสปีด`,
    });
  if (agg.category === "Driver" && agg.launch.n && agg.launch.mean > 17)
    tips.push({
      text: `Driver launch ${agg.launch.mean.toFixed(0)}° is high — likely scooping/skying. Tee lower, ball forward, centre the strike.`,
      th: `ไดรเวอร์ launch ${agg.launch.mean.toFixed(0)}° สูงไป — น่าจะงัด/ลอยตั้ง ตั้งทีต่ำลง ลูกไปข้างหน้า เน้นโดนกลาง`,
    });
  if (tips.length === 0)
    tips.push({
      text: "Solid and repeatable — keep grooving this one.",
      th: "ตีได้ดีและสม่ำเสมอ — รักษาความรู้สึกนี้ไว้",
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
      text: `Clubface is closed across the bag (~${Math.abs(faceAvg).toFixed(0)}°) — a left-miss/hook bias. Fix grip & face awareness first; it's the biggest lever.`,
      th: `หน้าไม้ปิดเฉลี่ยทั้งถุง (~${Math.abs(faceAvg).toFixed(0)}°) มีแนวโน้มพลาดซ้าย/hook — แก้กริปและการคุมหน้าไม้ก่อน เป็นจุดที่ได้ผลมากสุด`,
      tone: "bad",
    });
  if (Number.isFinite(pathAvg) && pathAvg < -2)
    out.push({
      text: `You swing out-to-in / over the top (~${Math.abs(pathAvg).toFixed(1)}°). Train an in-to-out feel and shallow the club.`,
      th: `วงสวิงเข้า-ออก (out-to-in / over the top ~${Math.abs(pathAvg).toFixed(1)}°) — ฝึกฟีลลิ่ง in-to-out และ shallow ไม้ลงมา`,
      tone: "warn",
    });

  const worst = aggs
    .filter((a) => a.smash.n)
    .sort((a, b) => a.smash.mean - a.smashIdeal - (b.smash.mean - b.smashIdeal))[0];
  if (worst && worst.smash.mean < worst.smashIdeal - 0.08)
    out.push({
      text: `${worst.club} has your weakest contact (smash ${worst.smash.mean.toFixed(2)}). Centre-strike work here pays off most.`,
      th: `${worst.club} โดนหน้าไม้แย่สุด (smash ${worst.smash.mean.toFixed(2)}) — ฝึกตีให้โดนกลางหน้าไม้ที่ไม้นี้คุ้มสุด`,
      tone: "bad",
    });

  const loose = aggs
    .filter((a) => Number.isFinite(a.consistency))
    .sort((a, b) => b.consistency - a.consistency)[0];
  if (loose && loose.consistency > 20)
    out.push({
      text: `${loose.club} is least consistent (CV ${loose.consistency.toFixed(0)}%). Make it reliable or leave it in the bag on course.`,
      th: `${loose.club} นิ่งน้อยสุด (CV ${loose.consistency.toFixed(0)}%) — ทำให้สม่ำเสมอ หรือเก็บไว้ในถุงตอนออกรอบ`,
      tone: "warn",
    });

  const best = aggs
    .filter((a) => a.smash.n)
    .sort((a, b) => b.smash.mean - b.smashIdeal - (a.smash.mean - a.smashIdeal))[0];
  if (best && best.smash.mean >= best.smashIdeal - 0.03)
    out.push({
      text: `${best.club} is your most solid club — build your scoring strategy around it.`,
      th: `${best.club} คือไม้ที่มั่นใจสุด — วางแผนทำสกอร์โดยอิงไม้นี้`,
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
    return { label: "—", detail: "No smash data", tone: "info" };
  const diff = agg.smash.mean - agg.smashIdeal;
  if (diff >= -0.03)
    return { label: "Solid", detail: "Centered strike", tone: "good" };
  if (diff >= -0.08)
    return { label: "Decent", detail: "Slightly off-center", tone: "warn" };
  return { label: "Thin / toe-heel", detail: "Poor contact", tone: "bad" };
}

/**
 * Strike verdict from attack angle + smash. Driver wants +AoA (hit up);
 * everything off the turf wants ≤0 (ball-first). Flags "ตีหลังลูก" when the
 * club comes in level/up AND smash is down — a fat/thin signature.
 */
export function strikeVerdict(agg: ClubAgg): Tendency {
  const aoa = agg.attackAngle.n ? agg.attackAngle.mean : NaN;
  if (!Number.isFinite(aoa))
    return { label: "—", detail: "ไม่มีข้อมูล attack angle", tone: "info" };
  if (agg.category === "Driver")
    return aoa < 0
      ? { label: "Hitting down", detail: "ตีลงใส่ไดรเวอร์ — ลองตีขึ้น (+) เพิ่มระยะ", tone: "warn" }
      : { label: "Hitting up", detail: "ตีขึ้นถูกต้องสำหรับไดรเวอร์", tone: "good" };
  const smashOff = agg.smash.n ? agg.smash.mean - agg.smashIdeal : NaN;
  if (aoa >= 0 && Number.isFinite(smashOff) && smashOff < -0.08)
    return { label: "Hitting behind?", detail: "วงเข้าระดับ/ขึ้น + โดนไม่เต็ม — อาจตีหลังลูก/ปาดบาง", tone: "bad" };
  if (aoa >= 1)
    return { label: "Catching up", detail: "ตีขึ้นกับเหล็ก — กดลงโดนลูกก่อนดิน", tone: "warn" };
  return { label: "Ball-first", detail: "ตีลงโดนลูกก่อนดิน (ดี)", tone: "good" };
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
