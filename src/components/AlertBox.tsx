import { Fragment, type ReactNode } from "react";
import type { AlertKind, AlertPayload, AlertStyle } from "@/lib/alerts/types";
import { fmtParts, formatBaht, getDict } from "@/lib/i18n";
import { iconSprite, isIconId } from "@/lib/pets/icons";
import { PRESETS } from "@/lib/pets/sprites";
import { PixelSprite } from "./PixelSprite";

/** The on-stream alert. Pure presentational so the landing page and previews reuse it. */
export function AlertBox({
  kind,
  payload,
  accent = "#2f7a6a",
  progress,
  variant = "card",
  className = "w-[min(92vw,560px)]",
}: {
  kind: AlertKind;
  payload: AlertPayload;
  accent?: string;
  /** 0..1 remaining time, drawn as a stepped bar. */
  progress?: number;
  variant?: AlertStyle;
  className?: string;
}) {
  const d = getDict(payload.locale);
  const amount = formatBaht(payload.amount, payload.locale);
  const isPurchase = kind === "purchase" || Boolean(payload.productTitle);
  const unit = payload.unit ?? null;
  const amountNode = <span className="font-num">{amount}</span>;

  let headline: Array<ReactNode>;
  if (isPurchase) headline = fmtParts<ReactNode>(d.alert.bought, { name: payload.name, product: payload.productTitle ?? "" });
  else if (unit)
    headline = fmtParts<ReactNode>(d.alert.gave, {
      name: payload.name,
      unit: (
        <span className="inline-flex items-center gap-1 align-[-0.15em]">
          {isIconId(unit.icon) && <PixelSprite sprite={iconSprite(unit.icon)} size={22} />}
          {unit.name}
        </span>
      ),
      qty: <span className="font-num">{unit.qty}</span>,
    });
  else headline = fmtParts<ReactNode>(d.alert.tipped, { name: payload.name, amount: amountNode });

  const title = (
    <div className="font-display text-[1.35em] leading-tight break-words">
      {headline.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </div>
  );
  const sub = (isPurchase || unit) && <div className="font-num mt-0.5 text-ink-soft">{amount}</div>;
  const vote = payload.vote && (
    <div className="mt-1 inline-block bg-ink px-1.5 py-0.5 font-display text-[0.8em] text-paper">
      {fmtParts(d.alert.voted, { option: payload.vote }).join("")}
    </div>
  );
  const message = payload.message && <p className="mt-2 text-[1.1em] leading-snug break-words">{payload.message}</p>;
  const bar = progress !== undefined && <ProgressBar progress={progress} accent={accent} />;

  if (variant === "banner") {
    return (
      <div className={`px-frame px-frame-raised w-[min(96vw,1100px)] overflow-hidden bg-paper ${className}`} style={{ ["--accent" as string]: accent }}>
        <div className="flex items-stretch">
          <div className="flex shrink-0 items-center gap-3 px-4 py-3 text-paper" style={{ background: accent }}>
            <PixelSprite sprite={PRESETS.bird} size={44} />
            <div className="[&_.text-ink-soft]:text-paper/80">
              {title}
              {sub}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
            {payload.message ? <p className="text-[1.15em] leading-snug break-words">{payload.message}</p> : null}
            {vote}
          </div>
        </div>
        {bar && <div className="px-3 pb-2">{bar}</div>}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`px-frame px-frame-raised max-w-[min(92vw,460px)] bg-paper px-3 py-2 text-[0.9em] ${className}`} style={{ ["--accent" as string]: accent }}>
        <div className="flex items-center gap-2">
          <span className="size-3 shrink-0" style={{ background: accent }} />
          {title}
        </div>
        {sub}
        {vote}
        {payload.message && <p className="mt-1 leading-snug break-words">{payload.message}</p>}
        {bar}
      </div>
    );
  }

  return (
    <div className={`px-frame px-frame-raised bg-paper p-4 ${className}`} style={{ ["--accent" as string]: accent }}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 p-1" style={{ background: accent }}>
          <PixelSprite sprite={PRESETS.bird} size={56} />
        </div>
        <div className="min-w-0 flex-1">
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

function ProgressBar({ progress, accent }: { progress: number; accent: string }) {
  return (
    <div className="mt-3 flex gap-[3px]" aria-hidden>
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className="h-2 flex-1"
          style={{ background: i / 20 < progress ? accent : "color-mix(in srgb, var(--ink) 15%, transparent)" }}
        />
      ))}
    </div>
  );
}
