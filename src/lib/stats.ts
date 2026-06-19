import type { Shot, ShotMetric, ClubCategory } from "./types";
import { clubRank, categoryOf } from "./clubs";

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

export interface ClubAgg {
  club: string;
  category: ClubCategory;
  count: number;
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
  for (const [club, gs] of groups) {
    const carry = statOf(col(gs, "carry_distance"));
    let lateral = statOf(col(gs, "carry_deviation_distance"));
    if (lateral.n === 0) lateral = statOf(col(gs, "total_deviation_distance"));
    const category = gs[0].club_category ?? categoryOf(club);
    const consistency =
      carry.n > 1 && carry.mean > 0 ? (carry.std / carry.mean) * 100 : NaN;

    aggs.push({
      club,
      category,
      count: gs.length,
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
      lateral,
      apex: statOf(col(gs, "apex_height")),
      longestCarry: carry.n ? carry.max : NaN,
      smashIdeal: SMASH_IDEAL[category],
      consistency,
    });
  }

  return aggs.sort((a, b) => clubRank(a.club) - clubRank(b.club));
}

export interface Kpis {
  shots: number;
  clubs: number;
  longestCarry: { value: number; club: string } | null;
  avgSmash: number;
  avgBall: number;
}

export function overallKpis(shots: Shot[]): Kpis {
  const clubs = new Set(shots.map((s) => s.club ?? "Unknown"));
  let longest: { value: number; club: string } | null = null;
  for (const s of shots) {
    if (s.carry_distance != null && Number.isFinite(s.carry_distance)) {
      if (!longest || s.carry_distance > longest.value)
        longest = { value: s.carry_distance, club: s.club ?? "—" };
    }
  }
  return {
    shots: shots.length,
    clubs: clubs.size,
    longestCarry: longest,
    avgSmash: statOf(col(shots, "smash_factor")).mean,
    avgBall: statOf(col(shots, "ball_speed")).mean,
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

/** Merge sessions within the same calendar month into one point (for monthly trends). */
export function groupByMonth(data: SessionShots[]): SessionShots[] {
  const map = new Map<string, Shot[]>();
  for (const s of data) {
    const ym = (s.date || "").slice(0, 7);
    if (!ym) continue;
    const g = map.get(ym);
    if (g) g.push(...s.shots);
    else map.set(ym, [...s.shots]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, shots]) => ({ id: ym, date: `${ym}-01`, shots }));
}

/** Short, preliminary "what to adjust" tips for one club — pure logic, no AI. */
export function clubTips(agg: ClubAgg): string[] {
  const tips: string[] = [];
  if (agg.smash.n && agg.smash.mean < agg.smashIdeal - 0.08)
    tips.push(
      `Contact is off-centre (smash ${agg.smash.mean.toFixed(2)} vs ideal ~${agg.smashIdeal.toFixed(2)}). Groove a centre strike before chasing distance.`
    );
  if (agg.face.n && agg.face.mean < -3)
    tips.push(
      `Face ~${Math.abs(agg.face.mean).toFixed(0)}° closed at impact → aims left. Check grip; feel the toe stay back through impact.`
    );
  else if (agg.face.n && agg.face.mean > 3)
    tips.push(
      `Face ~${agg.face.mean.toFixed(0)}° open → aims right. Rotate/release the face more through impact.`
    );
  if (agg.clubPath.n && agg.clubPath.mean < -2)
    tips.push(
      `Path ${Math.abs(agg.clubPath.mean).toFixed(1)}° out-to-in (over the top). Feel more in-to-out and shallow the downswing.`
    );
  else if (agg.clubPath.n && agg.clubPath.mean > 4)
    tips.push(
      `Path ${agg.clubPath.mean.toFixed(1)}° in-to-out (very pushy). Calm the path toward neutral.`
    );
  if (Number.isFinite(agg.consistency) && agg.consistency > 15)
    tips.push(
      `Carry spread is wide (CV ${agg.consistency.toFixed(0)}%). Build a repeatable strike before adding speed.`
    );
  if (agg.category === "Driver" && agg.launch.n && agg.launch.mean > 17)
    tips.push(
      `Driver launch ${agg.launch.mean.toFixed(0)}° is high — likely scooping/skying. Tee lower, ball forward, centre the strike.`
    );
  if (tips.length === 0)
    tips.push("Solid and repeatable — keep grooving this one.");
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
