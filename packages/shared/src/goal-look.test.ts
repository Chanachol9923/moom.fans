import { describe, expect, it } from "vitest";
import { DEFAULT_GOAL_LOOK, GOAL_PRESETS, parseGoalLook } from "./goal-look";
import { LOOK_PRESETS } from "./overlay/design";
import { MAX_PRESETS_PER_KIND, newPresetId, parsePresets } from "./presets";

describe("parseGoalLook", () => {
  it("keeps the built-in presets as they are", () => {
    for (const p of Object.values(GOAL_PRESETS)) expect(parseGoalLook(p)).toEqual(p);
  });

  it("clamps numbers, drops unknown choices and bad colours", () => {
    const l = parseGoalLook({ bar: "rainbow", segments: 500, barHeight: 1, scale: 9, colors: { bg: "pink", fill: "#ABCDEF" } })!;
    expect(l.bar).toBe(DEFAULT_GOAL_LOOK.bar);
    expect(l.segments).toBe(60);
    expect(l.barHeight).toBe(4);
    expect(l.scale).toBe(2.5);
    expect(l.colors.bg).toBe(DEFAULT_GOAL_LOOK.colors.bg);
    expect(l.colors.fill).toBe("#abcdef");
  });

  it("keeps an empty fill (account colour) and escapes CSS", () => {
    const l = parseGoalLook({ colors: { fill: "" }, css: "</style><script>x</script>" })!;
    expect(l.colors.fill).toBe("");
    expect(l.css).not.toContain("<");
  });

  it("keeps a safe picture path and placement, and bounds the picture settings", () => {
    const l = parseGoalLook({ image: "uid/goals/run.gif", imagePlace: "rider", imageSize: 999, imageOpacity: 0 })!;
    expect(l).toMatchObject({ image: "uid/goals/run.gif", imagePlace: "rider", imageSize: 400, imageOpacity: 5 });
    expect(parseGoalLook({ image: "../other/x.png", imagePlace: "floating" })).toMatchObject({ image: null, imagePlace: "rider" });
    expect(parseGoalLook({ image: "https://evil.example/x.png" })?.image).toBeNull();
  });

  it("returns null for nothing", () => {
    expect(parseGoalLook(null)).toBeNull();
    expect(parseGoalLook("x")).toBeNull();
  });
});

describe("parsePresets", () => {
  it("keeps valid presets of each kind", () => {
    const p = parsePresets([
      { id: "abc12345", kind: "alert", name: " Hype ", look: LOOK_PRESETS.hype },
      { id: "def67890", kind: "goal", name: "Neon", look: GOAL_PRESETS.neon },
    ]);
    expect(p.map((x) => [x.kind, x.name])).toEqual([
      ["alert", "Hype"],
      ["goal", "Neon"],
    ]);
  });

  it("drops bad ids, empty names, unknown kinds and unreadable looks", () => {
    const p = parsePresets([
      { id: "x", kind: "goal", name: "a", look: {} },
      { id: "abcdefgh", kind: "goal", name: "  ", look: {} },
      { id: "abcdefgh", kind: "chat", name: "a", look: {} },
      { id: "abcdefgh", kind: "goal", name: "a", look: null },
    ]);
    expect(p).toEqual([]);
  });

  it("caps each kind", () => {
    const many = Array.from({ length: MAX_PRESETS_PER_KIND + 5 }, () => ({ id: newPresetId(), kind: "goal", name: "g", look: {} }));
    expect(parsePresets(many)).toHaveLength(MAX_PRESETS_PER_KIND);
  });

  it("makes ids the parser accepts", () => {
    for (let i = 0; i < 50; i++) expect(newPresetId()).toMatch(/^[a-z0-9]{6,16}$/);
  });
});
