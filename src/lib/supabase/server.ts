import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client. This app has no auth, so we use the public
 * anon/publishable key directly and never persist a session. Used from
 * Server Components and Server Actions.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
