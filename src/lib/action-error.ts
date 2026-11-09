import "server-only";
import type { ErrorCode } from "./errors";

/**
 * A database error as a code the dashboard can explain. The real message goes to the
 * server log only: it can name tables and columns, and it means nothing to a streamer.
 */
export function dbError(where: string, e: { code?: string; message: string }): ErrorCode {
  console.error(`[${where}]`, e.code ?? "", e.message);
  // 42703 / PGRST204: a column the code expects doesn't exist (migration not applied).
  if (e.code === "42703" || e.code === "PGRST204") return "not_ready";
  if (e.code === "23505") return "duplicate";
  // Check constraints and bad input syntax: a value the database refused.
  if (e.code === "23514" || e.code === "22P02" || e.code === "22001") return "invalid";
  return "save_failed";
}
