"use client";
import { pixelsToSprite } from "@moom/shared/pets/pixelate";
import { SPRITE_SIZE, type PetSprite } from "@moom/shared/pets/sprites";

/** A picture (first frame of a GIF) shrunk to 16x16, standing on the bottom edge, as pixels to draw over. */
export async function pictureToSprite(blob: Blob): Promise<PetSprite> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = c.height = SPRITE_SIZE;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const k = Math.min(SPRITE_SIZE / bmp.width, SPRITE_SIZE / bmp.height);
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  ctx.drawImage(bmp, Math.floor((SPRITE_SIZE - w) / 2), SPRITE_SIZE - h, w, h);
  bmp.close();
  return pixelsToSprite(ctx.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE).data);
}
