// Error codes the dashboard shows to people. Server actions return these short codes
// (never a database or storage message); the UI turns them into something actionable.

import type { Dict } from "@moom/shared/i18n";

export type ErrorCode =
  | "network" // the request never got an answer: offline, timeout
  | "not_ready" // the database is behind the code (migration not applied yet)
  | "invalid" // the server rejected a value
  | "duplicate"
  | "too_big"
  | "bad_type"
  | "save_failed"; // anything else; details are in the server log

export function errorText(code: string | null | undefined, d: Dict): string {
  switch (code) {
    case "network":
      return d.common.errNetwork;
    case "not_ready":
      return d.common.errNotReady;
    case "invalid":
      return d.common.errInvalid;
    case "duplicate":
      return d.common.errDuplicate;
    case "too_big":
      return d.common.errTooBig;
    case "bad_type":
      return d.common.errBadType;
    default:
      return d.common.error;
  }
}

/**
 * Next's own control flow (a redirect after the session expired) arrives as a thrown
 * error with a NEXT_ digest; it must keep travelling. Anything else is a failed request.
 */
export function isNextControl(e: unknown): boolean {
  return !!e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_");
}

/**
 * Wraps a server action for useActionState so a dropped connection shows a message in
 * the form instead of throwing the whole page into the error screen.
 */
export function guardForm<S>(action: (prev: S, form: FormData) => Promise<S>, failed: (prev: S) => S) {
  return async (prev: S, form: FormData): Promise<S> => {
    try {
      // A redirecting action can resolve to nothing; keep the form as it was.
      return (await action(prev, form)) ?? prev;
    } catch (e) {
      if (isNextControl(e)) throw e;
      return failed(prev);
    }
  };
}

/** Storage errors as codes. Supabase reports size/type limits only in English prose. */
export function uploadErrorCode(message: string | undefined): ErrorCode {
  const m = (message ?? "").toLowerCase();
  if (/exceeded|too large|payload|size/.test(m)) return "too_big";
  if (/mime|type .*not supported|invalid.*type/.test(m)) return "bad_type";
  if (/fetch|network|timeout|failed to/.test(m)) return "network";
  return "save_failed";
}
