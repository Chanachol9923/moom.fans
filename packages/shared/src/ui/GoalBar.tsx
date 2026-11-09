import type { CSSProperties } from "react";
import { fontStack } from "@moom/shared/fonts";
import type { GoalLook } from "@moom/shared/goal-look";
import { fmt, formatBaht, type Dict, type Locale } from "@moom/shared/i18n";

type Props = {
  title: string;
  raised: number;
  target: number;
  endsAt?: string | null;
  accent: string;
  d: Dict;
  locale: Locale;
  segments?: number;
  /** A designed look (the OBS widget). Without one, the classic pixel bar. */
  look?: GoalLook | null;
};

/**
 * Progress bar for a tip goal. Shared by the storefront, the dashboard and the OBS widget.
 * Stable class names for custom CSS: .moom-goal, __title, __percent, __bar, __fill,
 * __amounts, __deadline.
 */
export function GoalBar(props: Props) {
  return props.look ? <DesignedGoal {...props} look={props.look} /> : <ClassicGoal {...props} />;
}

const pctOf = (raised: number, target: number) => (target > 0 ? Math.min(100, Math.floor((raised / target) * 100)) : 0);

function deadline(endsAt: string, d: Dict, locale: Locale) {
  return fmt(d.store.goalEnds, {
    date: new Date(endsAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Bangkok",
    }),
  });
}

function ClassicGoal({ title, raised, target, endsAt, accent, d, locale, segments = 24 }: Props) {
  const pct = pctOf(raised, target);
  const filled = Math.round((pct / 100) * segments);
  return (
    <div className="moom-goal">
      <div className="flex items-baseline justify-between gap-3">
        <span className="moom-goal__title font-title text-lg leading-tight">{title}</span>
        <span className="moom-goal__percent font-num text-lg" style={{ color: accent }}>
          {pct}%
        </span>
      </div>
      <div className="moom-goal__bar mt-2 flex gap-[3px] bg-ink p-[3px]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className="h-4 flex-1" style={{ background: i < filled ? accent : "color-mix(in srgb, var(--paper) 18%, transparent)" }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-3 text-sm text-ink-soft">
        <span className="moom-goal__amounts font-num">
          {fmt(d.store.raised, { raised: formatBaht(raised, locale), target: formatBaht(target, locale) })}
        </span>
        {endsAt && <span className="moom-goal__deadline">{deadline(endsAt, d, locale)}</span>}
      </div>
    </div>
  );
}

const rgba = (hex: string, alpha: number) => `color-mix(in srgb, ${hex} ${alpha}%, transparent)`;

function DesignedGoal({ title, raised, target, endsAt, accent, d, locale, look: l }: Props & { look: GoalLook }) {
  const pct = pctOf(raised, target);
  const fill = l.colors.fill || accent;
  const pixel = l.frame === "pixel";
  const outline = l.outline
    ? "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000"
    : undefined;
  const box: CSSProperties & Record<string, string | number | undefined> = {
    ["--ink"]: l.colors.border,
    background: rgba(l.colors.bg, l.colors.bgAlpha),
    border: l.frame === "rounded" ? `3px solid ${l.colors.border}` : undefined,
    borderRadius: l.frame === "rounded" ? l.radius : undefined,
    boxShadow:
      pixel || l.shadow === "none" ? undefined : l.shadow === "soft" ? "0 10px 30px rgba(0,0,0,0.35)" : "6px 6px 0 rgba(0,0,0,0.35)",
    fontSize: `${l.scale}em`,
    color: l.colors.text,
    fontFamily: fontStack(l.numFont),
    textShadow: outline,
    textAlign: l.layout === "center" ? "center" : undefined,
  };
  const titleEl = l.show.title && (
    <span className="moom-goal__title leading-tight" style={{ fontFamily: fontStack(l.font), fontWeight: l.weight, color: l.colors.title, fontSize: "1.15em" }}>
      {title}
    </span>
  );
  const pctEl = l.show.percent && (
    <span className="moom-goal__percent font-semibold tabular-nums" style={{ color: fill, fontSize: "1.15em" }}>
      {pct}%
    </span>
  );
  const head =
    l.layout === "row" ? (
      <div className="flex items-baseline justify-between gap-3">
        {titleEl}
        {pctEl}
      </div>
    ) : (
      <div className={l.layout === "center" ? "grid justify-items-center gap-0.5" : "grid gap-0.5"}>
        {titleEl}
        {pctEl}
      </div>
    );

  return (
    <div className={`moom-goal moom-goal--${l.bar} p-3 ${pixel ? `px-frame ${l.shadow === "hard" ? "px-frame-raised" : ""}` : ""}`} style={box}>
      {(l.show.title || l.show.percent) && head}
      <Bar look={l} pct={pct} fill={fill} />
      {(l.show.amounts || (l.show.deadline && endsAt)) && (
        <div className={`mt-1 flex gap-3 text-[0.85em] ${l.layout === "center" ? "justify-center" : "justify-between"}`}>
          {l.show.amounts && (
            <span className="moom-goal__amounts tabular-nums">
              {fmt(d.store.raised, { raised: formatBaht(raised, locale), target: formatBaht(target, locale) })}
            </span>
          )}
          {l.show.deadline && endsAt && <span className="moom-goal__deadline">{deadline(endsAt, d, locale)}</span>}
        </div>
      )}
    </div>
  );
}

function Bar({ look: l, pct, fill }: { look: GoalLook; pct: number; fill: string }) {
  const h = l.bar === "thin" ? Math.min(l.barHeight, 10) : l.barHeight;
  const round = l.frame === "rounded" ? 999 : 0;
  const aria = { role: "progressbar" as const, "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 };
  if (l.bar === "segments") {
    const filled = Math.round((pct / 100) * l.segments);
    return (
      <div className="moom-goal__bar mt-2 flex gap-[3px] p-[3px]" style={{ background: l.colors.track }} {...aria}>
        {Array.from({ length: l.segments }, (_, i) => (
          <span key={i} className="flex-1" style={{ height: h, background: i < filled ? fill : rgba(l.colors.bg, 22) }} />
        ))}
      </div>
    );
  }
  const stripes =
    l.bar === "stripes"
      ? `repeating-linear-gradient(-45deg, ${fill} 0 10px, color-mix(in srgb, ${fill} 70%, white) 10px 20px)`
      : fill;
  return (
    <div className="moom-goal__bar mt-2 overflow-hidden" style={{ height: h, borderRadius: round, background: rgba(l.colors.track, 60) }} {...aria}>
      <div className="moom-goal__fill h-full" style={{ width: `${pct}%`, borderRadius: round, background: stripes, transition: "width 600ms steps(12)" }} />
    </div>
  );
}
