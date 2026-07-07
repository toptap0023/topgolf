import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the request's auth cookies, so RLS
 * sees the logged-in user. Used from Server Components and Server Actions.
 * Reading cookies makes every caller dynamic (no ISR) — required for
 * per-user data.
 */
export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            /* called from a Server Component — middleware refreshes instead */
          }
        },
      },
    }
  );
}
