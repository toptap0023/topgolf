import type { ClubCategory } from "./types";

export interface NormalizedClub {
  label: string; // clean display label, e.g. "7 Iron", "PW", "Driver"
  category: ClubCategory;
}

/**
 * Turn a raw Garmin club string ("7 iron", "Iron 7", "P. Wedge", "3W", "56°")
 * into a stable label + category so shots group correctly regardless of how
 * the device spelled it.
 */
export function normalizeClub(raw: string | null | undefined): NormalizedClub {
  const s = (raw ?? "").trim();
  if (!s) return { label: "Unknown", category: "Other" };
  const c = s.toLowerCase();
  const num = c.match(/(\d{1,2})/);
  const n = num ? parseInt(num[1], 10) : null;

  if (/driver|^dr\b/.test(c)) return { label: "Driver", category: "Driver" };

  if (/wood|fairway|\b\dw\b/.test(c)) {
    return { label: n ? `${n} Wood` : "Wood", category: "Wood" };
  }
  if (/hybrid|rescue|\b\dh\b/.test(c)) {
    return { label: n ? `${n} Hybrid` : "Hybrid", category: "Hybrid" };
  }
  // Wedges (by name or loft in degrees)
  if (/pitching|\bpw\b/.test(c)) return { label: "PW", category: "Wedge" };
  if (/gap|approach|\bgw\b|\baw\b/.test(c)) return { label: "GW", category: "Wedge" };
  if (/sand|\bsw\b/.test(c)) return { label: "SW", category: "Wedge" };
  if (/lob|\blw\b/.test(c)) return { label: "LW", category: "Wedge" };
  if (n && n >= 46 && n <= 64 && /°|deg|wedge/.test(c))
    return { label: `${n}°`, category: "Wedge" };
  if (/wedge/.test(c)) return { label: n ? `${n}°` : "Wedge", category: "Wedge" };

  if (/iron|\b\di\b/.test(c)) {
    return { label: n ? `${n} Iron` : "Iron", category: "Iron" };
  }
  if (/putter|putt/.test(c)) return { label: "Putter", category: "Putter" };

  // bare number → assume iron (most common range case)
  if (n && /^\s*\d{1,2}\s*$/.test(c)) return { label: `${n} Iron`, category: "Iron" };

  return { label: s, category: "Other" };
}

export function categoryOf(club: string | null | undefined): ClubCategory {
  return normalizeClub(club).category;
}

/** Bag order, longest club first → used to sort tables/charts. */
export function clubRank(club: string | null | undefined): number {
  if (!club) return 999;
  const c = club.toLowerCase();
  let m: RegExpMatchArray | null;
  if (/driver|^dr\b/.test(c)) return 0;
  if ((m = c.match(/(\d+)\s*wood/)) || (m = c.match(/(\d+)w\b/)))
    return 10 + parseInt(m[1], 10);
  if (/wood|fairway/.test(c)) return 18;
  if ((m = c.match(/(\d+)\s*hybrid/)) || (m = c.match(/(\d+)h\b/)))
    return 30 + parseInt(m[1], 10);
  if (/hybrid|rescue/.test(c)) return 38;
  if ((m = c.match(/(\d+)\s*iron/)) || (m = c.match(/^\s*(\d+)\s*$/)))
    return 50 + parseInt(m[1], 10);
  if (/iron/.test(c)) return 59;
  if (/pitching|\bpw\b/.test(c)) return 70;
  if (/gap|approach|\bgw\b|\baw\b/.test(c)) return 72;
  if (/sand|\bsw\b/.test(c)) return 74;
  if (/lob|\blw\b/.test(c)) return 76;
  if ((m = c.match(/(\d{2})/)) && +m[1] >= 46 && +m[1] <= 64)
    return 70 + (+m[1] - 46) / 4;
  if (/wedge/.test(c)) return 78;
  if (/putter|putt/.test(c)) return 90;
  return 80;
}

/** Stable color per club category (used across all charts). */
export const CATEGORY_COLOR: Record<ClubCategory, string> = {
  Driver: "#16a34a",
  Wood: "#0a84ff",
  Hybrid: "#5e5ce6",
  Iron: "#bf5af2",
  Wedge: "#ff9f0a",
  Putter: "#8e8e93",
  Other: "#5ac8fa",
};

/** General categorical series palette for multi-line charts. */
export const SERIES_COLORS = [
  "#16a34a",
  "#0a84ff",
  "#ff9f0a",
  "#bf5af2",
  "#5ac8fa",
  "#ff375f",
  "#30d158",
  "#ffd60a",
];
