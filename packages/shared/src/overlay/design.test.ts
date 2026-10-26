import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK, LOOK_PRESETS, MAX_TIERS, mediaKindOf, parseLook, parseStoredTiers, safeCss, tierFor, toAlertTiers } from "./design";

const UID = "11111111-1111-1111-1111-111111111111";

describe("parseStoredTiers", () => {
  it("cleans, defaults and sorts tiers", () => {
    const t = parseStoredTiers([
      { min_amount: 500, title: "big", animation: "shake", accent: "#FFAA00", style: "banner" },
      { min_amount: 0 },
      { min_amount: "x" },
      { min_amount: 100, animation: "explode", accent: "red", style: "huge" },
    ]);
    expect(t.map((x) => x.min_amount)).toEqual([0, 100, 500]);
    expect(t[0]).toEqual({ min_amount: 0, media_path: null, sound_path: null, title: "", accent: null, animation: "pop", style: null, look: null });
    expect(t[1]).toMatchObject({ animation: "pop", accent: null, style: null });
    expect(t[2]).toMatchObject({ animation: "shake", accent: "#ffaa00", style: "banner", title: "big" });
  });

  it("only keeps file paths inside the owner's folder", () => {
    const [t] = parseStoredTiers(
      [{ min_amount: 0, media_path: `${UID}/alerts/a.gif`, sound_path: "someone-else/sounds/b.mp3" }],
      `${UID}/`,
    );
    expect(t.media_path).toBe(`${UID}/alerts/a.gif`);
    expect(t.sound_path).toBeNull();
    const [bad] = parseStoredTiers([{ min_amount: 0, media_path: `${UID}/../x.gif` }], `${UID}/`);
    expect(bad.media_path).toBeNull();
  });

  it("caps the number of tiers and ignores junk", () => {
    expect(parseStoredTiers(Array.from({ length: 20 }, (_, i) => ({ min_amount: i })))).toHaveLength(MAX_TIERS);
    expect(parseStoredTiers("nope")).toEqual([]);
    expect(parseStoredTiers([null, 3, { min_amount: -1 }])).toEqual([]);
  });
});

describe("tierFor", () => {
  const tiers = toAlertTiers(parseStoredTiers([{ min_amount: 0 }, { min_amount: 100 }, { min_amount: 1000 }]), () => null);
  it("picks the highest tier the amount reaches", () => {
    expect(tierFor(tiers, 20)?.index).toBe(0);
    expect(tierFor(tiers, 100)?.index).toBe(1);
    expect(tierFor(tiers, 999.99)?.index).toBe(1);
    expect(tierFor(tiers, 5000)?.index).toBe(2);
  });
  it("is null below the first tier or without tiers", () => {
    const from50 = toAlertTiers(parseStoredTiers([{ min_amount: 50 }]), () => null);
    expect(tierFor(from50, 20)).toBeNull();
    expect(tierFor([], 20)).toBeNull();
    expect(tierFor(undefined, 20)).toBeNull();
  });
});

describe("media and CSS", () => {
  it("tells videos from images", () => {
    expect(mediaKindOf("u/alerts/x.webm")).toBe("video");
    expect(mediaKindOf("u/alerts/x.MP4")).toBe("video");
    expect(mediaKindOf("u/alerts/x.gif")).toBe("image");
    expect(mediaKindOf(null)).toBeNull();
  });
  it("can't close the style element early", () => {
    const css = safeCss('.a{color:red}</style><script>alert(1)</script>.b{content:"<3"}');
    expect(css).not.toContain("<");
    expect(css).toContain("\\3c /style>");
  });
});

describe("parseLook", () => {
  it("keeps valid looks and clamps or replaces bad values", () => {
    expect(parseLook(LOOK_PRESETS.hype)).toEqual(LOOK_PRESETS.hype);
    const l = parseLook({ layout: "diagonal", scale: 9, width: 10, colors: { bg: "red", bgAlpha: 150, name: "#ABCDEF" } });
    expect(l).toMatchObject({ layout: DEFAULT_LOOK.layout, scale: 2.5, width: 240 });
    expect(l?.colors).toMatchObject({ bg: DEFAULT_LOOK.colors.bg, bgAlpha: 100, name: "#abcdef" });
  });
  it("is null when there is no look", () => {
    expect(parseLook(null)).toBeNull();
    expect(parseLook("card")).toBeNull();
  });
});
