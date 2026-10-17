import { describe, expect, it } from "vitest";
import { darken, isPetSprite, PRESETS, resolveSprite, SPRITE_SIZE } from "./sprites";

describe("preset sprites", () => {
  it.each(Object.entries(PRESETS))("%s frames are 16x16 and use known colours", (_name, sprite) => {
    expect(isPetSprite(sprite)).toBe(true);
    for (const frame of Object.values(sprite.frames)) {
      expect(frame).toHaveLength(SPRITE_SIZE);
      for (const row of frame) expect(row).toHaveLength(SPRITE_SIZE);
    }
  });

  it("sleeping frames have no open eyes", () => {
    for (const sprite of Object.values(PRESETS)) {
      expect(sprite.frames.sleep.join("")).not.toContain("e");
    }
  });
});

describe("resolveSprite", () => {
  it("applies body/accent overrides and derives the shade", () => {
    const s = resolveSprite("cat", { body: "#ffffff", accent: "#000000" }, null)!;
    expect(s.palette.b).toBe("#ffffff");
    expect(s.palette.d).toBe(darken("#ffffff"));
    expect(s.palette.a).toBe("#000000");
  });

  it("ignores junk overrides", () => {
    const s = resolveSprite("bird", { body: "red; background:url(x)" }, null)!;
    expect(s.palette.b).toBe(PRESETS.bird.palette.b);
  });

  it("validates custom sprites", () => {
    expect(resolveSprite("custom", null, { palette: {}, frames: {} })).toBeNull();
    expect(resolveSprite("custom", null, PRESETS.slime)).toEqual(PRESETS.slime);
    expect(resolveSprite("unicorn", null, null)).toBeNull();
  });
});
