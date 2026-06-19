"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "topgolf_gate";
const FIVE_YEARS = 60 * 60 * 24 * 365 * 5; // effectively "no timeout"

export async function unlock(
  formData: FormData
): Promise<{ error?: string }> {
  const pin = String(formData.get("pin") ?? "").trim();
  const pass = process.env.APP_PASSCODE;
  if (!pass) redirect("/"); // gate disabled
  if (pin !== pass) return { error: "PIN ไม่ถูกต้อง" };

  const jar = await cookies();
  jar.set(COOKIE, pass, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FIVE_YEARS,
  });

  const next = String(formData.get("next") || "/");
  redirect(next.startsWith("/") ? next : "/");
}

export async function revealPin(
  formData: FormData
): Promise<{ pin?: string; error?: string }> {
  const code = String(formData.get("code") ?? "").trim();
  if (code !== process.env.APP_RECOVERY_CODE)
    return { error: "รหัสกู้คืนไม่ถูกต้อง" };
  return { pin: process.env.APP_PASSCODE };
}
