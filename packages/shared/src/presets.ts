import type { AlertLook } from "./alerts";
import { parseGoalLook, type GoalLook } from "./goal-look";
import { parseLook } from "./overlay/design";

// Looks a streamer saved under their own name, to reuse on another tier or switch back to.
// Stored on overlay_settings.look_presets, newest first.

export type PresetKind = "alert" | "goal";
export type SavedPreset =
  | { id: string; kind: "alert"; name: string; look: AlertLook }
  | { id: string; kind: "goal"; name: string; look: GoalLook };

export const MAX_PRESETS_PER_KIND = 24;
export const MAX_PRESET_NAME = 40;

export function newPresetId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

/** Keeps only presets that still parse into a valid look; caps each kind. */
export function parsePresets(v: unknown): SavedPreset[] {
  if (!Array.isArray(v)) return [];
  const out: SavedPreset[] = [];
  const count = { alert: 0, goal: 0 };
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const id = typeof p.id === "string" && /^[a-z0-9]{6,16}$/.test(p.id) ? p.id : null;
    const name = typeof p.name === "string" ? p.name.trim().slice(0, MAX_PRESET_NAME) : "";
    if (!id || !name) continue;
    if (p.kind === "alert" && count.alert < MAX_PRESETS_PER_KIND) {
      const look = parseLook(p.look);
      if (look) {
        out.push({ id, kind: "alert", name, look });
        count.alert++;
      }
    } else if (p.kind === "goal" && count.goal < MAX_PRESETS_PER_KIND) {
      const look = parseGoalLook(p.look);
      if (look) {
        out.push({ id, kind: "goal", name, look });
        count.goal++;
      }
    }
  }
  return out;
}
