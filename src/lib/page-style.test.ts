import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_CONFIG, parsePageConfig, safePageCss } from "./page-config";

describe("page design options", () => {
  it("defaults keep today's look", () => {
    expect(DEFAULT_PAGE_CONFIG).toMatchObject({
      shape: "pixel",
      layout: "split",
      width: "normal",
      header: { banner: "short", avatar: "square", align: "left" },
      textScale: 1,
      css: "",
      colors: { paper: null, card: null, text: null, muted: null, field: null },
    });
  });

  it("drops bad values instead of failing", () => {
    const c = parsePageConfig({ shape: "blob", textScale: 5, colors: { paper: "red", text: "#112233" }, header: { banner: "huge" } });
    expect(c.shape).toBe("pixel");
    expect(c.textScale).toBe(1);
    expect(c.colors).toMatchObject({ paper: null, text: "#112233" });
    expect(c.header.banner).toBe("short");
  });
});

describe("profile and cover pictures", () => {
  it("old saved pages keep their look and gain the new options", () => {
    const c = parsePageConfig({ header: { banner: "tall", avatar: "round", align: "center" } });
    expect(c.header).toEqual({
      banner: "tall",
      bannerHeight: 220,
      avatar: "round",
      avatarSize: "m",
      avatarBorder: true,
      overlap: true,
      align: "center",
    });
    expect(c.bannerImage).toEqual({ x: 50, y: 50, zoom: 1, dim: 0 });
    expect(c.avatarImage).toEqual({ x: 50, y: 50, zoom: 1 });
  });

  it("keeps placement and sizes inside their ranges", () => {
    const c = parsePageConfig({
      header: { banner: "custom", bannerHeight: 9999, avatarSize: "xxl" },
      bannerImage: { x: 10, y: 120, zoom: 2.5, dim: 40 },
      avatarImage: { zoom: 0.2 },
    });
    expect(c.header.banner).toBe("custom");
    expect(c.header.bannerHeight).toBe(220);
    expect(c.header.avatarSize).toBe("m");
    expect(c.bannerImage).toEqual({ x: 10, y: 50, zoom: 2.5, dim: 40 });
    expect(c.avatarImage.zoom).toBe(1);
  });
});

describe("gift unit picture", () => {
  it("keeps a safe storage path and drops anything else", () => {
    expect(parsePageConfig({ unit: { iconPath: "uid/units/corn.gif" } }).unit.iconPath).toBe("uid/units/corn.gif");
    expect(parsePageConfig({ unit: { iconPath: "https://evil.example/x.gif" } }).unit.iconPath).toBeNull();
    expect(DEFAULT_PAGE_CONFIG.unit.iconPath).toBeNull();
  });
});

describe("safePageCss", () => {
  it("can't close the style tag or import other stylesheets", () => {
    const out = safePageCss('</style><script>x</script> @import url("https://evil.example/a.css"); .x{color:red}');
    expect(out).not.toContain("<");
    expect(out).not.toMatch(/@import/i);
    expect(out).toContain(".x{color:red}");
  });

  it("removes pictures from other sites but keeps inline ones", () => {
    expect(safePageCss(".a{background:url(https://tracker.example/p.gif)}")).toBe(".a{background:none}");
    expect(safePageCss(".a{background:url('data:image/png;base64,AAA')}")).toContain("data:image/png");
  });
});
