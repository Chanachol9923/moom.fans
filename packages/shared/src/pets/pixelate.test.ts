import { describe, expect, it } from "vitest";
import { pixelsToSprite, PIXEL_SLOTS } from "./pixelate";
import { isPetSprite, resolveSprite, SPRITE_SIZE } from "./sprites";

const N = SPRITE_SIZE * SPRITE_SIZE;

function bitmap(color: (i: number) => [number, number, number, number]) {
  const out = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) out.set(color(i), i * 4);
  return out;
}

describe("pixelsToSprite", () => {
  it("keeps see-through pixels empty and makes a valid sprite", () => {
    const s = pixelsToSprite(bitmap((i) => (i % 2 ? [255, 0, 0, 255] : [0, 0, 0, 0])));
    expect(isPetSprite(s)).toBe(true);
    expect(s.frames.stand[0]).toBe(".k".repeat(SPRITE_SIZE / 2));
    expect(s.palette.k).toBe("#ff0000");
  });

  it("never uses more colours than the editor has brushes", () => {
    const s = pixelsToSprite(bitmap((i) => [(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255]));
    expect(Object.keys(s.palette).length).toBeLessThanOrEqual(PIXEL_SLOTS.length);
    expect(isPetSprite(s)).toBe(true);
  });

  it("the step frame is the picture one pixel higher", () => {
    const s = pixelsToSprite(bitmap((i) => (Math.floor(i / SPRITE_SIZE) === 15 ? [0, 0, 255, 255] : [0, 0, 0, 0])));
    expect(s.frames.step[14]).toBe("k".repeat(SPRITE_SIZE));
    expect(s.frames.step[15]).toBe(".".repeat(SPRITE_SIZE));
  });
});

describe("picture pets", () => {
  const url = (p: string) => `https://cdn.example/${p}`;
  it("resolve to the picture URL when the path is in a pets folder", () => {
    expect(resolveSprite("image", {}, { image: "uid-1/pets/abc-mikan.gif" }, url)?.image).toBe("https://cdn.example/uid-1/pets/abc-mikan.gif");
  });
  it("carry their on-screen size, kept within range", () => {
    expect(resolveSprite("image", {}, { image: "uid-1/pets/a.gif" }, url)?.imageSize).toBe(64);
    expect(resolveSprite("image", {}, { image: "uid-1/pets/a.gif", size: 128 }, url)?.imageSize).toBe(128);
    expect(resolveSprite("image", {}, { image: "uid-1/pets/a.gif", size: 9999 }, url)?.imageSize).toBe(192);
    expect(resolveSprite("image", {}, { image: "uid-1/pets/a.gif", size: "big" }, url)?.imageSize).toBe(64);
  });
  it("refuse paths outside a pets folder", () => {
    expect(resolveSprite("image", {}, { image: "uid-1/avatar/x.png" }, url)).toBeNull();
    expect(resolveSprite("image", {}, { image: "../x.png" }, url)).toBeNull();
    expect(resolveSprite("image", {}, { image: "https://evil.example/x.png" }, url)).toBeNull();
  });
});
