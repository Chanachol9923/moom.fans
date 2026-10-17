import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Supabase client acting as the signed-in user (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

export type SessionUser = { id: string; email: string | null };

/**
 * The signed-in user, from the session JWT. The project signs tokens with an asymmetric
 * key (ES256), so getClaims() verifies the signature locally against the cached JWKS
 * instead of calling the Auth server on every request like getUser() does.
 * Wrapped in cache() so a layout, its page and their components share one check.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user: SessionUser | null =
    claims && typeof claims.sub === "string"
      ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null }
      : null;
  return { supabase, user };
});
