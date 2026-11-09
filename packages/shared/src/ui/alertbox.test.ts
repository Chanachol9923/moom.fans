import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "../overlay/design";
import { AlertBox } from "./AlertBox";

const payload = { name: "Pim", amount: 100, message: "hi", productTitle: null, media: null, tts: false, locale: "th" as const };

describe("AlertBox behind-text picture", () => {
  it("places and zooms the picture from the look", () => {
    const html = renderToStaticMarkup(
      createElement(AlertBox, {
        kind: "tip",
        payload,
        media: { url: "https://example.com/a.png", kind: "image" },
        look: { ...DEFAULT_LOOK, layout: "background", imageX: 20, imageY: 75, imageZoom: 1.6 },
      }),
    );
    expect(html).toContain("object-position:20% 75%");
    expect(html).toContain("transform:scale(1.6)");
    expect(html).toContain("transform-origin:20% 75%");
  });

  it("leaves an unzoomed picture untransformed", () => {
    const html = renderToStaticMarkup(
      createElement(AlertBox, {
        kind: "tip",
        payload,
        media: { url: "https://example.com/a.png", kind: "image" },
        look: { ...DEFAULT_LOOK, layout: "background" },
      }),
    );
    expect(html).toContain("object-position:50% 50%");
    expect(html).not.toContain("scale(");
  });
});
