import type { Shot, GolfSession, GolfRound, DistanceUnit, SpeedUnit } from "./types";
import type { ClubAgg, Kpis } from "./stats";
import { shotShape } from "./stats";
import { distanceUnitLabel, speedUnitLabel } from "./format";

function r(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "";
  const f = Math.pow(10, digits);
  return String(Math.round(n * f) / f);
}

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const SHOT_COLUMNS: { header: string; get: (s: Shot, ses?: GolfSession) => string }[] =
  [
    { header: "Session Date", get: (s, ses) => ses?.played_on ?? "" },
    { header: "Shot Time", get: (s) => s.shot_time ?? "" },
    { header: "Club", get: (s) => s.club ?? "" },
    { header: "Carry", get: (s) => r(s.carry_distance, 0) },
    { header: "Total", get: (s) => r(s.total_distance, 0) },
    { header: "Ball Speed", get: (s) => r(s.ball_speed) },
    { header: "Club Speed", get: (s) => r(s.club_speed) },
    { header: "Smash Factor", get: (s) => r(s.smash_factor, 2) },
    { header: "Launch Angle", get: (s) => r(s.launch_angle) },
    { header: "Launch Direction", get: (s) => r(s.launch_direction) },
    { header: "Spin Rate", get: (s) => r(s.spin_rate, 0) },
    { header: "Spin Axis", get: (s) => r(s.spin_axis) },
    { header: "Backspin", get: (s) => r(s.backspin, 0) },
    { header: "Sidespin", get: (s) => r(s.sidespin, 0) },
    { header: "Apex Height", get: (s) => r(s.apex_height) },
    { header: "Carry Offline", get: (s) => r(s.carry_deviation_distance) },
    { header: "Total Offline", get: (s) => r(s.total_deviation_distance) },
    { header: "Attack Angle", get: (s) => r(s.attack_angle) },
    { header: "Club Path", get: (s) => r(s.club_path) },
    { header: "Club Face", get: (s) => r(s.club_face) },
    { header: "Face to Path", get: (s) => r(s.face_to_path) },
  ];

/** Clean, machine-friendly CSV (one row per shot) for re-export / feeding to AI. */
export function shotsToCsv(
  shots: Shot[],
  sessionsById: Record<string, GolfSession>
): string {
  const head = SHOT_COLUMNS.map((c) => c.header).join(",");
  const lines = shots.map((s) =>
    SHOT_COLUMNS.map((c) => esc(c.get(s, sessionsById[s.session_id]))).join(",")
  );
  return [head, ...lines].join("\n");
}

/** Per-club summary table as CSV (great compact input for an AI coach). */
export function clubTableCsv(
  aggs: ClubAgg[],
  distUnit: DistanceUnit,
  speedUnit: SpeedUnit
): string {
  const d = distanceUnitLabel(distUnit);
  const sp = speedUnitLabel(speedUnit);
  const head = [
    "Club",
    "Shots",
    `Carry Avg (${d})`,
    `Carry StdDev (${d})`,
    `Total Avg (${d})`,
    `Ball Speed (${sp})`,
    "Smash",
    "Launch (deg)",
    "Spin (rpm)",
    `Side Bias (${d}, +R/-L)`,
    "Shape",
  ].join(",");
  const rows = aggs.map((a) =>
    [
      esc(a.club),
      a.count,
      r(a.carry.mean, 1),
      r(a.carry.std, 1),
      r(a.total.mean, 1),
      r(a.ball.mean, 1),
      r(a.smash.mean, 2),
      r(a.launch.mean, 1),
      r(a.spin.mean, 0),
      r(a.lateral.mean, 1),
      esc(shotShape(a).label),
    ].join(",")
  );
  return [head, ...rows].join("\n");
}

/** Rounds / scorecards as CSV — for sending to an AI or a spreadsheet. */
export function roundsToCsv(rounds: GolfRound[]): string {
  const head = "Date,Course,Score,Par,Holes,Putts,Fairways Hit,GIR,Notes";
  const lines = rounds.map((r) =>
    [
      r.played_on,
      esc(r.course ?? ""),
      r.score ?? "",
      r.par ?? "",
      r.holes ?? "",
      r.putts ?? "",
      r.fairways_hit ?? "",
      r.greens_in_regulation ?? "",
      esc(r.notes ?? ""),
    ].join(",")
  );
  return [head, ...lines].join("\n");
}

export function exportFilename(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${prefix}-${stamp}.csv`;
}

/** Ready-to-paste prompt that turns the stats into an AI coaching request. */
export function buildCoachPrompt(opts: {
  aggs: ClubAgg[];
  kpis: Kpis;
  rounds: GolfRound[];
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
  currentScore?: number | null;
  targetScore?: number;
}): string {
  const { aggs, kpis, rounds, distanceUnit, speedUnit } = opts;
  const target = opts.targetScore ?? 85;
  const d = distanceUnitLabel(distanceUnit);
  const sp = speedUnitLabel(speedUnit);

  const recentScores = rounds
    .filter((r2) => r2.score != null)
    .slice(0, 8)
    .map((r2) => `${r2.played_on}: ${r2.score}${r2.course ? ` @ ${r2.course}` : ""}`)
    .join("; ");
  const current =
    opts.currentScore ??
    rounds.find((r2) => r2.score != null)?.score ??
    null;

  const tableHeader = `| Club | Shots | Carry ${d} | Carry σ | Total ${d} | Ball ${sp} | Smash | Launch° | Spin rpm | Side ${d} (+R/-L) | Shape |\n|---|---|---|---|---|---|---|---|---|---|---|`;
  const tableRows = aggs
    .map((a) => {
      const f = (n: number, dig = 1) =>
        Number.isFinite(n) ? (Math.round(n * 10 ** dig) / 10 ** dig).toString() : "–";
      return `| ${a.club} | ${a.count} | ${f(a.carry.mean, 0)} | ${f(a.carry.std, 1)} | ${f(a.total.mean, 0)} | ${f(a.ball.mean, 1)} | ${f(a.smash.mean, 2)} | ${f(a.launch.mean, 1)} | ${f(a.spin.mean, 0)} | ${f(a.lateral.mean, 1)} | ${shotShape(a).label} |`;
    })
    .join("\n");

  return `You are an expert PGA golf coach and launch-monitor analyst.

My goal: lower my 18-hole score from about ${current ?? 105} to ${target}.

Below is a summary of my Garmin Approach R10 launch-monitor practice data. Distances are in ${d}, speeds in ${sp}. "Carry σ" is the standard deviation of carry distance (lower = more consistent). "Side" is the average lateral miss (+ = right, − = left). "Shape" is my typical shot pattern.

Headline numbers: ${kpis.shots} shots across ${kpis.clubs} clubs; longest carry ${
    kpis.longestCarry ? `${Math.round(kpis.longestCarry.value)} ${d} (${kpis.longestCarry.club})` : "n/a"
  }; average smash factor ${Number.isFinite(kpis.avgSmash) ? kpis.avgSmash.toFixed(2) : "n/a"}.
${recentScores ? `Recent rounds — ${recentScores}.` : ""}

Per-club data:
${tableHeader}
${tableRows}

Please analyze and give me:
1. The 3 biggest weaknesses holding my score back (cite the numbers).
2. Distance gapping problems — clubs that overlap or leave gaps.
3. Consistency/dispersion issues — which clubs are least reliable and why.
4. Contact quality — where my smash factor lags the ideal for that club.
5. Shot-shape tendencies (slice/hook) and how to neutralize them.
6. A specific, prioritized 4-week practice plan with drills and measurable targets to move me toward ${target}.

Be concrete and reference my actual numbers.`;
}
