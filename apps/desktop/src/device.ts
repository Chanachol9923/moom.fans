import { useCallback, useState } from "react";

// Settings that belong to this PC, not the account: they never sync to the web.

export type DeviceSettings = {
  /** Audio output device id; "" = system default. */
  sinkId: string;
  /** 0..100, or null to use the account's volume. */
  volume: number | null;
  /** Tauri accelerator, e.g. "CommandOrControl+Shift+X". */
  hotkey: string;
};

const KEY = "moom.desktop.device";
export const DEFAULT_HOTKEY = "CommandOrControl+Shift+X";
const DEFAULTS: DeviceSettings = { sinkId: "", volume: null, hotkey: DEFAULT_HOTKEY };

function load(): DeviceSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function useDeviceSettings() {
  const [s, setS] = useState(load);
  const update = useCallback((patch: Partial<DeviceSettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage full or blocked: keep it for this run */
      }
      return next;
    });
  }, []);
  return [s, update] as const;
}

/** Turns a keydown into an accelerator string, or null while only modifiers are held. */
export function acceleratorFrom(e: KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push("CommandOrControl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  const code = e.code;
  let key: string | null = null;
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
  else if (/^Digit[0-9]$/.test(code)) key = code.slice(5);
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) key = code;
  else if (["Pause", "ScrollLock", "Insert", "Home", "End", "PageUp", "PageDown", "Delete"].includes(code)) key = code;
  if (!key) return null;
  // A bare letter would fire while typing in chat; F-keys and Pause are fine alone.
  if (mods.length === 0 && !/^F\d+$|^Pause$|^ScrollLock$/.test(key)) return null;
  return [...mods, key].join("+");
}

/** "CommandOrControl+Shift+X" -> "Ctrl + Shift + X" */
export function prettyHotkey(acc: string) {
  return acc.replace("CommandOrControl", "Ctrl").split("+").join(" + ");
}
