import type { DistanceUnit, SpeedUnit } from "./types";

export function distanceUnitLabel(u: DistanceUnit | string | null): string {
  return u === "m" ? "m" : "yds";
}
export function speedUnitLabel(u: SpeedUnit | string | null): string {
  return u === "kph" ? "km/h" : u === "m/s" ? "m/s" : "mph";
}

/** Format a number with fixed decimals; em-dash for missing values. */
export function fmt(
  n: number | null | undefined,
  digits = 0
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
export const fmt1 = (n: number | null | undefined) => fmt(n, 1);
export const fmt2 = (n: number | null | undefined) => fmt(n, 2);

/** Signed value as left/right (for lateral dispersion & offline distance). */
export function lr(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = fmt(Math.abs(n), digits);
  if (Math.abs(n) < 0.05) return `${a}`;
  return n > 0 ? `${a} R` : `${a} L`;
}

/** Signed value with +/- (for path, face, attack angle). */
export function pm(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = fmt(Math.abs(n), digits);
  if (Math.abs(n) < 0.05) return `0`;
  return n > 0 ? `+${a}` : `−${a}`;
}

/** Club path: + = in-to-out (rightward), − = out-to-in (over the top). */
export function pathDir(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || Math.abs(n) < 0.1) return "square";
  return n > 0 ? "in→out" : "out→in";
}
export function clubPathLabel(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) < 0.1) return "square";
  return `${fmt(Math.abs(n), digits)}° ${pathDir(n)}`;
}

/** Club face: + = open (right of target), − = closed (left of target). */
export function faceDir(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || Math.abs(n) < 0.1) return "square";
  return n > 0 ? "open" : "closed";
}
export function faceLabel(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) < 0.1) return "square";
  return `${fmt(Math.abs(n), digits)}° ${faceDir(n)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonthShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 7 ? `${iso}-01T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Today as YYYY-MM-DD (local). */
export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
