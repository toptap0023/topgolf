"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedShot, DistanceUnit, SpeedUnit } from "@/lib/types";
import type { RoundInput } from "@/lib/roundsCsv";

const ALL = "00000000-0000-0000-0000-000000000000";

function revalidateAll() {
  for (const p of ["/", "/sessions", "/analyze", "/rounds", "/export"])
    revalidatePath(p);
}

export interface ImportPayload {
  session: {
    played_on: string;
    title: string | null;
    location: string | null;
    source_filename: string | null;
    distance_unit: DistanceUnit;
    speed_unit: SpeedUnit;
    notes: string | null;
  };
  shots: ParsedShot[];
}

export async function importSession(
  payload: ImportPayload
): Promise<{ sessionId?: string; error?: string; count?: number }> {
  try {
    if (!payload.shots.length)
      return { error: "No shots to import / ไม่มีช็อตให้นำเข้า" };
    const supabase = await createClient();

    const { data: ses, error: e1 } = await supabase
      .from("golf_sessions")
      .insert(payload.session)
      .select("id")
      .single();
    if (e1 || !ses)
      return { error: e1?.message ?? "Could not create session / สร้างเซสชันไม่สำเร็จ" };
    const sessionId = ses.id as string;

    const rows = payload.shots.map((s, i) => ({
      ...s,
      session_id: sessionId,
      shot_index: s.shot_index ?? i + 1,
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const { error: e2 } = await supabase
        .from("golf_shots")
        .insert(rows.slice(i, i + 500));
      if (e2) {
        // Roll back the session so we never leave a half-imported session behind.
        await supabase.from("golf_sessions").delete().eq("id", sessionId);
        return { error: e2.message };
      }
    }

    revalidateAll();
    return { sessionId, count: rows.length };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Import failed / นำเข้าไม่สำเร็จ",
    };
  }
}

export async function deleteSession(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("golf_sessions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export interface RoundPayload {
  played_on: string;
  course: string | null;
  score: number | null;
  par: number | null;
  holes: number | null;
  putts: number | null;
  fairways_hit: number | null;
  greens_in_regulation: number | null;
  notes: string | null;
}

export async function addRound(
  payload: RoundPayload
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("golf_rounds").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/rounds");
  revalidatePath("/");
  return {};
}

export async function importRounds(
  rounds: RoundInput[]
): Promise<{ count?: number; error?: string }> {
  if (!rounds.length)
    return { error: "No rounds to import / ไม่มีรอบให้นำเข้า" };
  const supabase = await createClient();
  const payload = rounds.map((r) => ({
    played_on: r.played_on || undefined,
    course: r.course,
    score: r.score,
    par: r.par ?? 72,
    holes: r.holes ?? 18,
    putts: r.putts,
    fairways_hit: r.fairways_hit,
    greens_in_regulation: r.greens_in_regulation,
    notes: r.notes,
  }));
  const { error } = await supabase.from("golf_rounds").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/rounds");
  revalidatePath("/");
  return { count: payload.length };
}

export async function deleteRound(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("golf_rounds").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/rounds");
  revalidatePath("/");
  return {};
}

export async function clearAllData(pin: string): Promise<{ error?: string }> {
  if (process.env.APP_PASSCODE && pin !== process.env.APP_PASSCODE)
    return { error: "Wrong PIN / PIN ไม่ถูกต้อง" };
  const supabase = await createClient();
  // shots cascade from sessions, but delete explicitly to be safe.
  await supabase.from("golf_shots").delete().neq("id", ALL);
  const { error: e1 } = await supabase
    .from("golf_sessions")
    .delete()
    .neq("id", ALL);
  const { error: e2 } = await supabase
    .from("golf_rounds")
    .delete()
    .neq("id", ALL);
  if (e1 || e2) return { error: (e1 ?? e2)?.message };
  revalidateAll();
  return {};
}

/** "Forgot PIN" recovery: a correct recovery code reveals the current PIN.
 *  Used inside the Clear-all-data flow (the only PIN-gated action). */
export async function revealPin(
  code: string
): Promise<{ pin?: string; error?: string }> {
  if (!process.env.APP_RECOVERY_CODE)
    return { error: "No recovery code set / ยังไม่ได้ตั้งรหัสกู้คืน" };
  if (code.trim() !== process.env.APP_RECOVERY_CODE)
    return { error: "Wrong recovery code / รหัสกู้คืนไม่ถูกต้อง" };
  return { pin: process.env.APP_PASSCODE };
}
