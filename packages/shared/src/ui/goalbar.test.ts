import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_GOAL_LOOK, GOAL_IMAGE_PLACES } from "../goal-look";
import { getDict } from "../i18n";
import { GoalBar } from "./GoalBar";

const base = { title: "Mic", raised: 500, target: 1000, endsAt: null, accent: "#2f7a6a", d: getDict("en"), locale: "en" as const };

describe("GoalBar pictures", () => {
  it("draws the picture in every placement", () => {
    for (const place of GOAL_IMAGE_PLACES) {
      const html = renderToStaticMarkup(
        createElement(GoalBar, { ...base, look: { ...DEFAULT_GOAL_LOOK, image: "u/goals/a.gif", imagePlace: place }, imageUrl: "https://x/a.gif" }),
      );
      expect(html, place).toContain(`data-place="${place}"`);
    }
  });

  it("puts the rider where the goal is", () => {
    const html = renderToStaticMarkup(
      createElement(GoalBar, { ...base, look: { ...DEFAULT_GOAL_LOOK, image: "u/goals/a.gif", imagePlace: "rider" }, imageUrl: "https://x/a.gif" }),
    );
    expect(html).toContain("left:50%");
  });

  it("plays videos as videos", () => {
    const html = renderToStaticMarkup(
      createElement(GoalBar, { ...base, look: { ...DEFAULT_GOAL_LOOK, image: "u/goals/a.webm", imagePlace: "end" }, imageUrl: "https://x/a.webm" }),
    );
    expect(html).toContain("<video");
  });

  it("shows no picture without a URL", () => {
    const html = renderToStaticMarkup(createElement(GoalBar, { ...base, look: { ...DEFAULT_GOAL_LOOK, image: "u/goals/a.gif" } }));
    expect(html).not.toContain("moom-goal__image");
  });
});
