import "server-only";
import { randomBytes } from "node:crypto";

/** URL-safe random secret. 24 bytes = 192 bits. */
export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
