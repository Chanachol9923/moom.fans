import { describe, expect, it } from "vitest";
import { buildFilter, cleanMessage } from "./filter";
import { mediaSecondsFor, parseMediaUrl } from "./media";

describe("parseMediaUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", 0],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ", 42],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s", "dQw4w9WgXcQ", 65],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ", 0],
  ])("%s", (url, id, start) => {
    expect(parseMediaUrl(url)).toEqual({ provider: "youtube", id, start });
  });

  it.each(["not a url", "https://vimeo.com/123", "https://youtube.com/watch?v=short", "javascript:alert(1)"])(
    "rejects %s",
    (url) => expect(parseMediaUrl(url)).toBeNull(),
  );
});

describe("mediaSecondsFor", () => {
  it("floors and caps", () => {
    expect(mediaSecondsFor(60, 1, 120)).toBe(60);
    expect(mediaSecondsFor(59.99, 2, 120)).toBe(29);
    expect(mediaSecondsFor(1000, 1, 120)).toBe(120);
    expect(mediaSecondsFor(0.5, 1, 120)).toBe(0);
  });
});

describe("filter", () => {
  it("masks blocked words inside Thai text", () => {
    const f = buildFilter(["เหี้ย", "bad"]);
    expect(f.mask("ไอ้เหี้ยนี่ BAD มาก")).toBe("ไอ้*****นี่ *** มาก");
    expect(f.hits("bad bad")).toBe(2);
  });

  it("is a no-op with an empty list", () => {
    expect(buildFilter([]).mask("hello")).toBe("hello");
  });

  it("cleans messages", () => {
    expect(cleanMessage("hi\n\nthere https://evil.test/x  ok")).toBe("hi there ok");
  });
});
