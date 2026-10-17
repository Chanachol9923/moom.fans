import type { StageView } from "@moom/shared/overlay/engine";

// Messages between the app window (which runs the alert engine) and the OBS page
// (which only draws). The app is the source of truth; the OBS page says hello every
// few seconds so the app knows it's there and resends the current view.

export type ToStage = { t: "view"; view: StageView } | { t: "speak"; user: string; text: string };

export type FromStage =
  | { t: "hello"; id: string; preview: boolean }
  | { t: "bye"; id: string }
  /** The wheel passed a slot; the app plays the click so it goes to the right audio device. */
  | { t: "tick" };

export const HELLO_MS = 4000;
const STALE_MS = HELLO_MS * 3;

/** Counts OBS pages that said hello recently (not the app's own preview). */
export class StageClients {
  private seen = new Map<string, { at: number; preview: boolean }>();

  hello(id: string, preview: boolean, now = Date.now()) {
    const isNew = !this.seen.has(id);
    this.seen.set(id, { at: now, preview });
    return isNew;
  }

  bye(id: string) {
    this.seen.delete(id);
  }

  count(now = Date.now()) {
    let n = 0;
    for (const [id, c] of this.seen) {
      if (now - c.at > STALE_MS) this.seen.delete(id);
      else if (!c.preview) n++;
    }
    return n;
  }
}
