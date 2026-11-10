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
