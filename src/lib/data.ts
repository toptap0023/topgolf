import { createClient } from "./supabase/server";
import type { GolfSession, Shot, GolfRound } from "./types";
import type { SessionShots } from "./stats";

export async function getSessions(): Promise<GolfSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("golf_sessions")
    .select("*")
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GolfSession[];
}

export async function getSession(id: string): Promise<GolfSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("golf_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GolfSession) ?? null;
}

export async function getShotsForSession(sessionId: string): Promise<Shot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("golf_shots")
    .select("*")
    .eq("session_id", sessionId)
    .order("shot_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Shot[];
}

export async function getAllShots(): Promise<Shot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("golf_shots")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(20000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Shot[];
}

export async function getRounds(): Promise<GolfRound[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("golf_rounds")
    .select("*")
    .order("played_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GolfRound[];
}

/** Sessions (chronological asc) each with their shots · for trend charts. */
export async function getSessionShots(): Promise<SessionShots[]> {
  const supabase = await createClient();
  const [sessionsRes, shotsRes] = await Promise.all([
    supabase
      .from("golf_sessions")
      .select("id, played_on")
      .order("played_on", { ascending: true }),
    supabase.from("golf_shots").select("*").limit(20000),
  ]);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (shotsRes.error) throw new Error(shotsRes.error.message);

  const byId = new Map<string, Shot[]>();
  for (const s of (shotsRes.data ?? []) as Shot[]) {
    const g = byId.get(s.session_id);
    if (g) g.push(s);
    else byId.set(s.session_id, [s]);
  }
  return ((sessionsRes.data ?? []) as { id: string; played_on: string }[]).map(
    (ses) => ({ id: ses.id, date: ses.played_on, shots: byId.get(ses.id) ?? [] })
  );
}
