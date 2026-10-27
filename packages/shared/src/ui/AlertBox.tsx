import { Fragment, type ReactNode } from "react";
import type { AlertKind, AlertLook, AlertPayload, AlertStyle } from "@moom/shared/alerts";
import { fmtParts, formatBaht, getDict } from "@moom/shared/i18n";
import { iconSprite, isIconId } from "@moom/shared/pets/icons";
import { PRESETS } from "@moom/shared/pets/sprites";
import { fontStack } from "../fonts";
import { PixelSprite } from "./PixelSprite";

/** Image, GIF or video that replaces the pigeon. */
export type AlertMedia = { url: string; kind: "image" | "video" };

/**
 * The on-stream alert. Pure presentational so the landing page and previews reuse it.
 *
 * Class names starting with `moom-alert` are a public contract: streamers target them in
 * their custom CSS (see ALERT_CSS_CLASSES). Rename them only with a migration path.
 */
export function AlertBox({
  kind,
  payload,
  accent = "#2f7a6a",
  progress,
  durationMs,
  variant = "card",
  className = "w-[min(92vw,560px)]",
  media,
  title: titleTemplate,
  tier,
  look,
}: {
  kind: AlertKind;
  payload: AlertPayload;
  accent?: string;
  /** 0..1 remaining time, drawn as a static stepped bar (landing page illustration). */
  progress?: number;
  /** Animate the bar draining over this long. Pure CSS, so no re-renders while it runs. */
  durationMs?: number;
  variant?: AlertStyle;
  className?: string;
  media?: AlertMedia | null;
  /** Custom headline with {name} {amount} {product} {unit} {qty}; empty = default text. */
  title?: string;
  /** Tier number, exposed as data-tier for custom CSS. */
  tier?: number;
  /** No-code design from the dashboard. Overrides `variant`. */
  look?: AlertLook | null;
}) {
  const d = getDict(payload.locale);
  const amount = formatBaht(payload.amount, payload.locale);
  const isPurchase = kind === "purchase" || Boolean(payload.productTitle);
  const unit = payload.unit ?? null;
  const amountNode = <span className="moom-alert__amount font-num">{amount}</span>;
  const unitNode = unit ? (
    <span className="inline-flex items-center gap-1 align-[-0.15em]">
      {isIconId(unit.icon) && <PixelSprite sprite={iconSprite(unit.icon)} size={22} />}
      {unit.name}
    </span>
  ) : (
    ""
  );
  const vars: Record<string, ReactNode> = {
    name: <span className="moom-alert__name">{payload.name}</span>,
    amount: amountNode,
    product: payload.productTitle ?? "",
    unit: unitNode,
    qty: <span className="font-num">{unit?.qty ?? ""}</span>,
  };

  const template = titleTemplate?.trim()
    ? titleTemplate
    : isPurchase
      ? d.alert.bought
      : unit
        ? d.alert.gave
        : d.alert.tipped;
  const headline = fmtParts<ReactNode>(template, vars);

  const title = (
    <div className="moom-alert__title font-display text-[1.35em] leading-tight break-words">
      {headline.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </div>
  );
  // The amount line under the headline when the headline itself doesn't say it.
  const showsAmount = /\{amount\}/.test(template);
  const sub = !showsAmount && (isPurchase || unit || titleTemplate?.trim()) && (
    <div className="moom-alert__sub font-num mt-0.5 text-ink-soft">{amount}</div>
  );
  const vote = payload.vote && (
    <div className="moom-alert__vote mt-1 inline-block bg-ink px-1.5 py-0.5 font-display text-[0.8em] text-paper">
      {fmtParts(d.alert.voted, { option: payload.vote }).join("")}
    </div>
  );
  const message = payload.message && (
    <p className="moom-alert__message mt-2 text-[1.1em] leading-snug break-words">{payload.message}</p>
  );
  const bar =
    durationMs !== undefined ? (
      <ProgressBar progress={1} accent={accent} durationMs={durationMs} />
    ) : progress !== undefined ? (
      <ProgressBar progress={progress} accent={accent} />
    ) : null;

  const rootProps = {
    "data-kind": kind,
    "data-tier": tier,
    "data-style": variant,
    style: { ["--accent" as string]: accent },
  };

  if (look) {
    return (
      <CustomAlert
        look={look}
        rootProps={rootProps}
        className={className}
        media={media}
        text={
          <>
            {title}
            {sub}
            {vote}
            {message}
          </>
        }
        bar={look.showBar ? bar : null}
      />
    );
  }

  if (variant === "banner") {
    return (
      <div
        {...rootProps}
        className={`moom-alert moom-alert--banner px-frame px-frame-raised w-[min(96vw,1100px)] overflow-hidden bg-paper ${className}`}
      >
        <div className="flex items-stretch">
          <div className="moom-alert__head flex shrink-0 items-center gap-3 px-4 py-3 text-paper" style={{ background: accent }}>
            <Visual media={media} size={44} />
            <div className="[&_.text-ink-soft]:text-paper/80">
              {title}
              {sub}
            </div>
          </div>
          <div className="moom-alert__body flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
            {payload.message ? (
              <p className="moom-alert__message text-[1.15em] leading-snug break-words">{payload.message}</p>
            ) : null}
            {vote}
          </div>
        </div>
        {bar && <div className="px-3 pb-2">{bar}</div>}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        {...rootProps}
        className={`moom-alert moom-alert--compact px-frame px-frame-raised max-w-[min(92vw,460px)] bg-paper px-3 py-2 text-[0.9em] ${className}`}
      >
        <div className="flex items-center gap-2">
          {media ? <Visual media={media} size={32} /> : <span className="size-3 shrink-0" style={{ background: accent }} />}
          {title}
        </div>
        {sub}
        {vote}
        {payload.message && <p className="moom-alert__message mt-1 leading-snug break-words">{payload.message}</p>}
        {bar}
      </div>
    );
  }

  // A big GIF reads better above the text than squeezed into the corner.
  if (media) {
    return (
      <div {...rootProps} className={`moom-alert moom-alert--card moom-alert--hero flex flex-col items-center text-center ${className}`}>
        <Visual media={media} size={220} />
        <div className="moom-alert__card px-frame px-frame-raised mt-2 w-full bg-paper p-4">
          {title}
          {sub}
          {vote}
          {message}
          {bar}
        </div>
      </div>
    );
  }

  return (
    <div {...rootProps} className={`moom-alert moom-alert--card px-frame px-frame-raised bg-paper p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="moom-alert__image shrink-0 p-1" style={{ background: accent }}>
          <PixelSprite sprite={PRESETS.bird} size={56} />
        </div>
        <div className="moom-alert__text min-w-0 flex-1">
          {title}
          {sub}
          {vote}
          {message}
        </div>
      </div>
      {bar}
    </div>
  );
}

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha / 100})`;
}

/** The alert as designed in the dashboard's no-code editor. */
function CustomAlert({
  look: l,
  rootProps,
  className,
  media,
  text,
  bar,
}: {
  look: AlertLook;
  rootProps: { style: Record<string, string> } & Record<string, unknown>;
  className: string;
  media?: AlertMedia | null;
  text: ReactNode;
  bar: ReactNode;
}) {
  const pixel = l.frame === "pixel";
  const shadow =
    l.shadow === "none" || pixel
      ? undefined
      : l.shadow === "soft"
        ? "0 10px 30px rgba(0,0,0,0.35)"
        : "6px 6px 0 rgba(0,0,0,0.35)";
  const style: Record<string, string | number | undefined> = {
    ...rootProps.style,
    // The pixel frame draws its border in --ink.
    ["--ink"]: l.colors.border,
    ["--look-text"]: l.colors.text,
    ["--look-name"]: l.colors.name,
    ["--look-amount"]: l.colors.amount,
    ["--look-message"]: l.colors.message,
    background: rgba(l.colors.bg, l.colors.bgAlpha),
    border: l.frame === "rounded" ? `3px solid ${l.colors.border}` : undefined,
    borderRadius: l.frame === "rounded" ? l.radius : undefined,
    boxShadow: pixel ? undefined : shadow,
    width: `min(96vw, ${l.width}px)`,
    fontFamily: fontStack(l.messageFont),
    ["--look-title-font"]: fontStack(l.font),
    ["--look-weight"]: String(l.weight),
    fontSize: `${l.scale}em`,
    textAlign: l.align,
  };
  const frameClass = pixel ? `px-frame ${l.shadow === "hard" ? "px-frame-raised" : ""}` : "";
  const cls = `moom-alert moom-alert--custom moom-alert--${l.layout} ${l.outline ? "moom-alert--outline" : ""} ${frameClass} ${className}`;
  const justify = l.align === "center" ? "center" : l.align === "right" ? "flex-end" : "flex-start";
  const visual = <Visual media={media} size={l.imageSize} />;

  if (l.layout === "background") {
    return (
      <div {...rootProps} className={`${cls} relative overflow-hidden`} style={{ ...style, minHeight: l.imageSize }}>
        {media && (
          <div className="absolute inset-0 grid place-items-center opacity-90">
            {media.kind === "video" ? (
              <video className="moom-alert__image size-full object-cover" src={media.url} autoPlay muted loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- shared with the desktop app
              <img className="moom-alert__image size-full object-cover" src={media.url} alt="" />
            )}
          </div>
        )}
        <div className="moom-alert__text relative p-4">
          {text}
          {bar}
        </div>
      </div>
    );
  }

  return (
    <div {...rootProps} className={`${cls} p-4`} style={style}>
      <div
        className="flex gap-3"
        style={{
          flexDirection: l.layout === "top" ? "column" : l.align === "right" ? "row-reverse" : "row",
          alignItems: l.layout === "top" ? (justify === "flex-start" ? "flex-start" : justify === "center" ? "center" : "flex-end") : "flex-start",
        }}
      >
        {l.layout !== "text" && <div className="shrink-0">{visual}</div>}
        <div className="moom-alert__text min-w-0 flex-1" style={{ width: l.layout === "top" ? "100%" : undefined }}>
          {text}
        </div>
      </div>
      {bar}
    </div>
  );
}

function Visual({ media, size }: { media?: AlertMedia | null; size: number }) {
  if (!media) return <PixelSprite sprite={PRESETS.bird} size={size} className="moom-alert__image" />;
  const style = { maxHeight: size, maxWidth: size * 1.8 };
  return media.kind === "video" ? (
    <video className="moom-alert__image block" src={media.url} style={style} autoPlay muted loop playsInline />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- shared with the desktop app, no next/image there
    <img className="moom-alert__image block" src={media.url} alt="" style={style} />
  );
}

/** Classes streamers can style. Shown in the dashboard next to the CSS box. */
export const ALERT_CSS_CLASSES = [
  ".moom-alert",
  ".moom-alert--card / --compact / --banner",
  ".moom-alert__image",
  ".moom-alert__title",
  ".moom-alert__name",
  ".moom-alert__amount",
  ".moom-alert__message",
  ".moom-alert__bar",
  '.moom-alert[data-tier="0"]',
  '.moom-alert[data-kind="purchase"]',
  ".moom-stage",
] as const;

function ProgressBar({ progress, accent, durationMs }: { progress: number; accent: string; durationMs?: number }) {
  const segments = Array.from({ length: 20 }, (_, i) => i);
  const track = "color-mix(in srgb, var(--ink) 15%, transparent)";
  return (
    <div className="moom-alert__bar relative mt-3" aria-hidden>
      <div className="flex gap-[3px]">
        {segments.map((i) => (
          <span key={i} className="h-2 flex-1" style={{ background: i / 20 < progress && durationMs === undefined ? accent : track }} />
        ))}
      </div>
      {durationMs !== undefined && (
        // Same segments in the accent colour, clipped from the right in 20 steps.
        <div
          className="absolute inset-0 flex gap-[3px]"
          style={{ animation: `px-drain ${durationMs}ms steps(20, end) forwards` }}
        >
          {segments.map((i) => (
            <span key={i} className="h-2 flex-1" style={{ background: accent }} />
          ))}
        </div>
      )}
    </div>
  );
}
