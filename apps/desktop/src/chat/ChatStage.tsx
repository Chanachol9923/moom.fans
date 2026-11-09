import { useEffect, useState, type CSSProperties } from "react";
import { brandFontCss, fontStack, googleFontsHref } from "@moom/shared/fonts";
import { cx } from "@moom/shared/ui/kit";
import type { ChatStyle } from "./style";
import type { ChatLine } from "./types";

/**
 * The chat box OBS shows. Lines arrive already filtered; this only draws them.
 * Stable class names for custom CSS: .moom-chat, .moom-chat__line (data-platform,
 * data-role, data-paid), __avatar, __name, __badge, __text, __emoji, __paid.
 */
export function ChatStage({
  lines,
  style: s,
  brandFontUrl,
  className,
}: {
  lines: ChatLine[];
  style: ChatStyle;
  brandFontUrl?: string | null;
  className?: string;
}) {
  const now = useNow(s.fadeAfter > 0);
  const shown = lines
    .slice(-s.maxLines)
    .filter((l) => s.fadeAfter === 0 || now - l.receivedAt < s.fadeAfter * 1000);
  const href = googleFontsHref([s.font]);
  const brand = s.font === "brand" ? brandFontCss(brandFontUrl) : "";
  const bg = `color-mix(in srgb, ${s.colors.bg} ${s.colors.bgAlpha}%, transparent)`;

  return (
    <div
      className={cx("moom-chat flex flex-col justify-end gap-1.5", s.align === "right" && "items-end", className)}
      style={
        {
          fontFamily: fontStack(s.font),
          fontSize: s.size,
          color: s.colors.text,
          "--chat-bg": bg,
          "--chat-name": s.colors.name,
          "--chat-highlight": s.colors.highlight,
        } as CSSProperties
      }
      data-look={s.look}
    >
      {href && <link key={href} rel="stylesheet" href={href} />}
      {brand && <style>{brand}</style>}
      {s.css && <style>{s.css}</style>}
      {shown.map((l) => (
        <Line key={l.id} l={l} s={s} />
      ))}
    </div>
  );
}

function Line({ l, s }: { l: ChatLine; s: ChatStyle }) {
  const highlight = !!(l.paid || l.member);
  const frame =
    s.look === "pixel"
      ? "px-frame bg-[var(--chat-bg)] px-3 py-1.5"
      : s.look === "bubble"
        ? "rounded-2xl bg-[var(--chat-bg)] px-3.5 py-1.5"
        : "px-1 [text-shadow:-2px_-2px_0_#000,2px_-2px_0_#000,-2px_2px_0_#000,2px_2px_0_#000]";
  return (
    <div
      className={cx(
        "moom-chat__line flex max-w-full items-start gap-2 leading-snug",
        `px-in-${s.enter}`,
        frame,
        highlight && s.look !== "clean" && "outline-[3px] outline-[var(--chat-highlight)] outline-solid",
      )}
      data-platform={l.platform}
      data-role={l.role ?? undefined}
      data-paid={highlight || undefined}
    >
      {s.avatars && l.avatar && (
        // eslint-disable-next-line @next/next/no-img-element -- not Next; plain page in OBS
        <img src={l.avatar} alt="" className="moom-chat__avatar mt-0.5 h-[1.4em] w-[1.4em] shrink-0 rounded-full" />
      )}
      <div className="min-w-0">
        {s.badges && <PlatformMark platform={l.platform} />}
        {s.badges && l.role && l.role !== "member" && (
          <span className="moom-chat__badge mr-1 bg-[var(--chat-name)] px-1 align-middle text-[0.6em] font-bold text-white uppercase">
            {l.role === "owner" ? "host" : "mod"}
          </span>
        )}
        <span
          className="moom-chat__name mr-1.5 font-semibold"
          style={{ color: s.userColors && l.color ? l.color : "var(--chat-name)" }}
        >
          {l.name}
        </span>
        {(l.paid || l.member) && (
          <span className="moom-chat__paid mr-1.5 bg-[var(--chat-highlight)] px-1.5 font-num text-[0.85em] text-ink">
            {l.paid ?? l.member}
          </span>
        )}
        <span className="moom-chat__text break-words">
          {l.parts.map((p, i) =>
            p.t === "text" ? (
              <span key={i}>{p.text}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- see above
              <img key={i} src={p.url} alt={p.alt} className="moom-chat__emoji inline h-[1.3em] w-auto align-middle" />
            ),
          )}
        </span>
      </div>
    </div>
  );
}

/** Small pixel marks; no logos, just the colours people recognise. */
function PlatformMark({ platform }: { platform: ChatLine["platform"] }) {
  return (
    <svg
      viewBox="0 0 8 8"
      className="moom-chat__platform mr-1.5 inline h-[0.8em] w-[0.8em] align-baseline"
      shapeRendering="crispEdges"
      aria-label={platform}
    >
      {platform === "youtube" ? (
        <>
          <rect x="0" y="1" width="8" height="6" fill="#ff0033" />
          <path d="M3 2h1v1h1v1h1v1h-1v1h-1v1h-1z" fill="#fff" />
        </>
      ) : (
        <>
          <path d="M1 0h7v5l-2 2h-2l-1 1h-1v-1h-2v-6z" fill="#9146ff" />
          <rect x="3" y="2" width="1" height="2" fill="#fff" />
          <rect x="5" y="2" width="1" height="2" fill="#fff" />
        </>
      )}
    </svg>
  );
}

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return now;
}
