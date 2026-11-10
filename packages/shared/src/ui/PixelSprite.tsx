import type { PetSprite, SpriteFrames } from "@moom/shared/pets/sprites";

/**
 * Static SVG render of a sprite frame. Horizontal runs of one colour become one rect,
 * which keeps the DOM small. Works in server and client components.
 */
export function PixelSprite({
  sprite,
  frame = "stand",
  size = 64,
  flip = false,
  className,
  title,
}: {
  sprite: PetSprite;
  frame?: keyof SpriteFrames;
  size?: number;
  flip?: boolean;
  className?: string;
  title?: string;
}) {
  if (sprite.image) {
    // Sleeping picture pets are drawn faded; GIFs animate on their own.
    return (
      // eslint-disable-next-line @next/next/no-img-element -- shared with the desktop app
      <img
        src={sprite.image}
        alt={title ?? ""}
        width={size}
        height={size}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          objectPosition: "bottom",
          imageRendering: "pixelated",
          opacity: frame === "sleep" ? 0.6 : undefined,
          transform: [flip ? "scaleX(-1)" : "", frame === "step" ? "translateY(-4%)" : ""].join(" ").trim() || undefined,
        }}
      />
    );
  }
  const rows = sprite.frames[frame];
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== "." && sprite.palette[ch]) {
        rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={end - x} height={1} fill={sprite.palette[ch]} />);
      }
      x = end;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${rows[0]?.length ?? 16} ${rows.length}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      role={title ? "img" : "presentation"}
      aria-label={title}
    >
      {rects}
    </svg>
  );
}
