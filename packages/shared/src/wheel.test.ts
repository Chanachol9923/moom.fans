import { describe, expect, it } from "vitest";
import { isWheelEvent, parseWheel, REEL_LAPS, REEL_SPIN_MS, reelTickTimes } from "./wheel";

describe("wheel place", () => {
  it("defaults to the main overlay, also for wheels saved before it existed", () => {
    expect(parseWheel({ enabled: true, items: [] }).place).toBe("overlay");
    expect(parseWheel({ place: "widget" }).place).toBe("widget");
    expect(parseWheel({ place: "elsewhere" }).place).toBe("overlay");
  });
  it("is a round wheel unless another look was picked", () => {
    expect(parseWheel({}).look).toBe("wheel");
    expect(parseWheel({ look: "reel" }).look).toBe("reel");
  });
});

describe("isWheelEvent", () => {
  it("takes a spin or a stop", () => {
    expect(isWheelEvent({ id: "a", items: ["x", "y"], result: 1 })).toBe(true);
    expect(isWheelEvent({ id: "a", stop: true })).toBe(true);
  });
  it("refuses results outside the list and odd shapes", () => {
    expect(isWheelEvent({ id: "a", items: ["x", "y"], result: 2 })).toBe(false);
    expect(isWheelEvent({ id: "a", items: ["x"], result: 0 })).toBe(false);
    expect(isWheelEvent({ items: ["x", "y"], result: 0 })).toBe(false);
    expect(isWheelEvent("spin")).toBe(false);
  });
});

describe("reelTickTimes", () => {
  it("one click per label passing, getting slower, ending when the reel stops", () => {
    const t = reelTickTimes(4, 2);
    expect(t).toHaveLength(REEL_LAPS * 4 + 2);
    expect(t.at(-1)).toBe(REEL_SPIN_MS);
    for (let i = 2; i < t.length; i++) expect(t[i] - t[i - 1]).toBeGreaterThanOrEqual(t[i - 1] - t[i - 2] - 1);
  });
});
