import { describe, expect, it } from "vitest";
import { brandFontCss, cleanFontChoice, fontFamilyName, fontStack, googleFontsHref } from "./fonts";

describe("fonts", () => {
  it("keeps only fonts we can load", () => {
    expect(cleanFontChoice("g:Kanit", "body")).toBe("g:Kanit");
    expect(cleanFontChoice("brand", "body")).toBe("brand");
    expect(cleanFontChoice("g:Comic Sans MS", "body")).toBe("body");
    expect(cleanFontChoice('g:Kanit"; }', "body")).toBe("body");
    expect(cleanFontChoice(42, "default")).toBe("default");
  });

  it("builds one Google Fonts URL, skipping weight ranges for single-weight faces", () => {
    const href = googleFontsHref(["g:Kanit", "g:Kanit", "pixel", "g:Press Start 2P", null]);
    expect(href).toBe(
      "https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Press+Start+2P&display=swap",
    );
    expect(googleFontsHref(["pixel", "brand", "default"])).toBeNull();
  });

  it("falls back to Thai faces and names families for variable overrides", () => {
    expect(fontStack("g:Press Start 2P")).toMatch(/^"Press Start 2P", var\(--font-thai-display\)/);
    expect(fontFamilyName("g:Kanit")).toBe('"Kanit"');
    expect(fontFamilyName("brand")).toBe('"MoomBrand"');
    expect(fontFamilyName("pixel")).toBeNull();
  });

  it("refuses font URLs that could break out of the CSS", () => {
    expect(brandFontCss("https://x.supabase.co/storage/v1/object/public/public-media/u/fonts/a.woff2")).toContain(
      'src:url("https://x.supabase.co/',
    );
    expect(brandFontCss('https://x/a.woff2");} body{display:none')).toBe("");
    expect(brandFontCss("javascript:alert(1)")).toBe("");
    expect(brandFontCss(null)).toBe("");
  });
});
