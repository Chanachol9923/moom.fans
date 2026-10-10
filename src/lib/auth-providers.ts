import "server-only";
import { publicEnv } from "@/lib/env";

export type EnabledProviders = { discord: boolean; google: boolean };

/**
 * Which social logins are switched on in the Supabase project. Asking Supabase means the
 * button appears as soon as a provider is enabled in its dashboard, with no redeploy, and
 * never appears for a provider that would just fail. The env flags are only a fallback
 * for when the settings endpoint can't be reached.
 */
export async function enabledProviders(): Promise<EnabledProviders> {
  try {
    const res = await fetch(`${publicEnv.supabaseUrl()}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseKey() },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = (await res.json()) as { external?: Record<string, boolean> };
      return { discord: Boolean(json.external?.discord), google: Boolean(json.external?.google) };
    }
  } catch {
    // fall through to the env flags
  }
  return { discord: publicEnv.authDiscord, google: publicEnv.authGoogle };
}
