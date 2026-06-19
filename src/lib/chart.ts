/** "Nice" number for axis scaling (1, 2, 5 × 10^k). */
export function niceNum(range: number, round: boolean): number {
  if (range <= 0 || !Number.isFinite(range)) return 1;
  const exp = Math.floor(Math.log10(range));
  const f = range / Math.pow(10, exp);
  let nf: number;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}

/** Evenly spaced, rounded axis ticks spanning [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = niceNum(max - min, false);
  const step = niceNum(range / Math.max(1, count), true);
  const nmin = Math.floor(min / step) * step;
  const nmax = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = nmin; v <= nmax + step / 2; v += step)
    out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Up to k evenly spaced indices in [0, n), always including first and last. */
export function pickIndices(n: number, k: number): number[] {
  if (n <= 0) return [];
  if (n <= k) return Array.from({ length: n }, (_, i) => i);
  const out = new Set<number>();
  for (let i = 0; i < k; i++) out.add(Math.round((i * (n - 1)) / (k - 1)));
  return Array.from(out).sort((a, b) => a - b);
}
