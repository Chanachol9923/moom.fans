import "server-only";
import type { OverlayEvent } from "@/lib/alerts/types";
import { admin } from "@/lib/supabase/admin";

export const OVERLAY_EVENT = "moom";

export function overlayTopic(channel: string): string {
  return `overlay:${channel}`;
}

/**
 * Nudge a streamer's overlay(s). Best effort: overlays also poll, so a dropped
 * broadcast only delays an alert by a few seconds.
 */
export async function notifyOverlay(channel: string, event: OverlayEvent): Promise<void> {
  try {
    const ch = admin().channel(overlayTopic(channel));
    await ch.httpSend(OVERLAY_EVENT, event);
    await admin().removeChannel(ch);
  } catch (e) {
    console.warn("realtime: broadcast failed", (e as Error).message);
  }
}
