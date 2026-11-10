"use client";
import { useEffect, useRef, useState } from "react";

/** A real overlay/widget page at its native size, scaled to fit, over a checkerboard. */
export function PreviewFrame({ src, width = 1920, height = 1080 }: { src: string; width?: number; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden"
      style={{
        height: height * scale,
        backgroundColor: "#cfd8dc",
        backgroundImage:
          "linear-gradient(45deg,#b8c4c9 25%,transparent 25%,transparent 75%,#b8c4c9 75%),linear-gradient(45deg,#b8c4c9 25%,transparent 25%,transparent 75%,#b8c4c9 75%)",
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0,10px 10px",
      }}
    >
      <iframe
        title="preview"
        src={src}
        width={width}
        height={height}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
        // The OBS page is light. If this frame inherited the dashboard's dark color-scheme,
        // the browser would paint a solid white backdrop behind it instead of the checkerboard.
        style={{ transform: `scale(${scale})`, background: "transparent", colorScheme: "normal" }}
        allow="autoplay"
      />
    </div>
  );
}
