import { describe, expect, it } from "vitest";
import { normalizeLinks, normalizePresets, normalizeUrl } from "./profile-info";

describe("normalizeUrl", () => {
  it("adds https:// when it is left out", () => {
    expect(normalizeUrl("youtube.com/@moom")).toBe("https://youtube.com/@moom");
    expect(normalizeUrl("  https://x.com/moom ")).toBe("https://x.com/moom");
  });
  it("refuses scripts, empty text and hosts without a dot", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("hello")).toBeNull();
  });
});

describe("normalizeLinks", () => {
  it("names a link after its site when the name is empty and skips broken ones", () => {
    expect(
      normalizeLinks([
        { label: "", url: "www.twitch.tv/moom" },
        { label: "YouTube", url: "" },
        { label: "Bad", url: "data:text/html,hi" },
      ]),
    ).toEqual([{ label: "twitch.tv", url: "https://www.twitch.tv/moom" }]);
  });
});

describe("normalizePresets", () => {
  it("sorts, drops repeats and nonsense, keeps at most 6", () => {
    expect(normalizePresets([100, 20, 20, 0, -5, 1.5, 50])).toEqual([20, 50, 100]);
    expect(normalizePresets([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("falls back to the defaults when nothing is left", () => {
    expect(normalizePresets([])).toEqual([20, 50, 100]);
  });
});
