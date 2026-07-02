"use client";

import { useEffect, useState } from "react";

/** Score journey settings (start → target), stored per-device in localStorage
 *  like the theme. ponytail: localStorage, move to a Supabase settings row if
 *  multi-device sync ever matters. */
export interface Goal {
  start: number;
  target: number;
}

export const DEFAULT_GOAL: Goal = { start: 105, target: 85 };
const KEY = "topgolf:goal";

export function readGoal(): Goal {
  if (typeof window === "undefined") return DEFAULT_GOAL;
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (
      Number.isFinite(g?.start) &&
      Number.isFinite(g?.target) &&
      g.start > g.target
    )
      return { start: g.start, target: g.target };
  } catch {
    /* fall through to default */
  }
  return DEFAULT_GOAL;
}

/** SSR-safe: first render uses the default, then hydrates from localStorage. */
export function useGoal(): [Goal, (g: Goal) => void] {
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);
  useEffect(() => setGoal(readGoal()), []);
  const save = (g: Goal) => {
    setGoal(g);
    try {
      localStorage.setItem(KEY, JSON.stringify(g));
    } catch {
      /* private mode · keep in-memory value */
    }
  };
  return [goal, save];
}
