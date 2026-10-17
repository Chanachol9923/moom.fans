import { createClient } from "@supabase/supabase-js";
import { deviceName, openExternal } from "./platform";

// The website the app belongs to: the local `npm run dev` site in development, production
// otherwise. VITE_SITE_URL overrides either.
export const SITE = (
  import.meta.env.VITE_SITE_URL || (import.meta.env.DEV ? "http://localhost:3000" : "https://moom-fans.vercel.app")
).replace(/\/$/, "");

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const configured = Boolean(url && key);

// The session lives in the app's own storage, separate from any browser.
export const supabase = createClient(url || "http://localhost", key || "missing", {
  auth: { storageKey: "moom.desktop.auth", detectSessionInUrl: false },
});

// ---- sign-in hand-off --------------------------------------------------------------
// 1. The app makes a PKCE verifier and opens /app/connect with its hash.
// 2. The streamer presses Allow on the web; the site returns moom://auth?code&state.
// 3. The app trades code + verifier for a one-time magic-link hash and verifies it.
// A stolen code is useless without the verifier, which never leaves this PC.

const PENDING = "moom.desktop.pending";

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function startSignIn() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  localStorage.setItem(PENDING, JSON.stringify({ verifier, state }));
  const q = new URLSearchParams({ state, challenge, device: await deviceName() });
  await openExternal(`${SITE}/app/connect?${q.toString()}`);
}

export function hasPendingSignIn() {
  return localStorage.getItem(PENDING) !== null;
}

/** `state` comes with a deep link; a pasted code has none. */
export async function finishSignIn(code: string, state?: string): Promise<boolean> {
  let pending: { verifier: string; state: string } | null = null;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING) ?? "null");
  } catch {
    pending = null;
  }
  if (!pending || (state !== undefined && state !== pending.state)) return false;

  const r = await fetch(`${SITE}/api/app/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim(), verifier: pending.verifier }),
  }).catch(() => null);
  if (!r?.ok) return false;
  const { token_hash } = (await r.json()) as { token_hash: string };
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash });
  if (error) return false;
  localStorage.removeItem(PENDING);
  return true;
}

/** Parses moom://auth?code=…&state=… */
export function parseAuthLink(link: string): { code: string; state: string } | null {
  try {
    const u = new URL(link);
    if (u.protocol !== "moom:") return null;
    const code = u.searchParams.get("code");
    const state = u.searchParams.get("state");
    return code && state ? { code, state } : null;
  } catch {
    return null;
  }
}
