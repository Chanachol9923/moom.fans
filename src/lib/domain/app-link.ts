import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { admin } from "@/lib/supabase/admin";

// Hands a website session to the desktop app without the app ever seeing a password.
// See supabase/migrations/20261017000001_app_links.sql for the flow.

const VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/; // RFC 7636 code_verifier
export const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/;
const CODE_RE = /^[A-Za-z0-9_-]{32}$/;

/** RFC 7636 S256: base64url(sha256(verifier)). */
export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code, "ascii").digest("hex");
}

export async function createAppLink(userId: string, challenge: string, deviceName: string): Promise<string> {
  if (!CHALLENGE_RE.test(challenge)) throw new Error("bad challenge");
  const code = randomBytes(24).toString("base64url"); // 32 chars
  const { error } = await admin()
    .from("app_links")
    .insert({ code_hash: hashCode(code), user_id: userId, challenge, device_name: deviceName.slice(0, 60) });
  if (error) throw new Error(`app link: ${error.message}`);
  return code;
}

export type ExchangeResult =
  | { ok: true; tokenHash: string; email: string }
  | { ok: false; error: "invalid" | "expired" | "mismatch" | "server" };

/**
 * Trade a one-time code + PKCE verifier for a one-time magic-link token. The app then
 * calls supabase.auth.verifyOtp({ type: "magiclink", token_hash }) to get its own session.
 */
export async function exchangeAppLink(code: string, verifier: string): Promise<ExchangeResult> {
  if (!CODE_RE.test(code) || !VERIFIER_RE.test(verifier)) return { ok: false, error: "invalid" };
  const db = admin();
  const { data: link } = await db
    .from("app_links")
    .select("user_id, challenge, expires_at, used_at")
    .eq("code_hash", hashCode(code))
    .maybeSingle();
  if (!link) return { ok: false, error: "invalid" };
  if (link.used_at || new Date(link.expires_at).getTime() < Date.now()) return { ok: false, error: "expired" };

  const expected = Buffer.from(link.challenge);
  const actual = Buffer.from(challengeFor(verifier));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { ok: false, error: "mismatch" };

  // Single use, even if two requests race.
  const { data: claimed } = await db
    .from("app_links")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", hashCode(code))
    .is("used_at", null)
    .select("user_id")
    .maybeSingle();
  if (!claimed) return { ok: false, error: "expired" };

  const { data: user } = await db.auth.admin.getUserById(claimed.user_id);
  const email = user.user?.email;
  if (!email) return { ok: false, error: "server" };
  // generateLink does not send an email; it only mints the token.
  const { data: gen, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !gen.properties?.hashed_token) return { ok: false, error: "server" };
  return { ok: true, tokenHash: gen.properties.hashed_token, email };
}
