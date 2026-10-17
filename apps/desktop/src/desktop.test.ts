import { describe, expect, it } from "vitest";
import { acceleratorFrom, prettyHotkey } from "./device";
import { StageClients } from "./stage-link";

const key = (code: string, mods: Partial<Record<"ctrlKey" | "altKey" | "shiftKey" | "metaKey", boolean>> = {}) =>
  ({ code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods }) as KeyboardEvent;

describe("acceleratorFrom", () => {
  it("builds Tauri accelerators", () => {
    expect(acceleratorFrom(key("KeyX", { ctrlKey: true, shiftKey: true }))).toBe("CommandOrControl+Shift+X");
    expect(acceleratorFrom(key("Digit5", { altKey: true }))).toBe("Alt+5");
    expect(acceleratorFrom(key("F9"))).toBe("F9");
    expect(acceleratorFrom(key("Pause"))).toBe("Pause");
  });
  it("ignores lone modifiers and bare letters that would fire while typing", () => {
    expect(acceleratorFrom(key("ShiftLeft", { shiftKey: true }))).toBeNull();
    expect(acceleratorFrom(key("KeyA"))).toBeNull();
    expect(acceleratorFrom(key("Space", { ctrlKey: true }))).toBeNull();
  });
  it("prints them for people", () => {
    expect(prettyHotkey("CommandOrControl+Shift+X")).toBe("Ctrl + Shift + X");
  });
});

describe("StageClients", () => {
  it("counts OBS pages that said hello recently, not the app's preview", () => {
    const c = new StageClients();
    expect(c.hello("obs", false, 0)).toBe(true);
    expect(c.hello("obs", false, 1000)).toBe(false);
    c.hello("preview", true, 1000);
    expect(c.count(2000)).toBe(1);
    c.hello("obs2", false, 2000);
    expect(c.count(2000)).toBe(2);
    c.bye("obs2");
    expect(c.count(2000)).toBe(1);
    // silent for longer than three hellos -> gone (OBS closed without saying bye)
    expect(c.count(1000 + 12_001)).toBe(0);
  });
});
