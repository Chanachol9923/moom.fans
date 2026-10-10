import { fmt, formatBaht, type Dict, type Locale } from "@/lib/i18n";

/** Stepped pixel progress bar for a tip goal. Shared by the storefront and the OBS widget. */
export function GoalBar({
  title,
  raised,
  target,
  endsAt,
  accent,
  d,
  locale,
  segments = 24,
}: {
  title: string;
  raised: number;
  target: number;
  endsAt?: string | null;
  accent: string;
  d: Dict;
  locale: Locale;
  segments?: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.floor((raised / target) * 100)) : 0;
  const filled = Math.round((pct / 100) * segments);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-lg leading-tight">{title}</span>
        <span className="font-num text-lg" style={{ color: accent }}>
          {pct}%
        </span>
      </div>
      <div className="mt-2 flex gap-[3px] bg-ink p-[3px]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className="h-4 flex-1" style={{ background: i < filled ? accent : "color-mix(in srgb, var(--paper) 18%, transparent)" }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-3 text-sm text-ink-soft">
        <span className="font-num">
          {fmt(d.store.raised, { raised: formatBaht(raised, locale), target: formatBaht(target, locale) })}
        </span>
        {endsAt && (
          <span>
            {fmt(d.store.goalEnds, {
              date: new Date(endsAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
                day: "numeric",
                month: "short",
                timeZone: "Asia/Bangkok",
              }),
            })}
          </span>
        )}
      </div>
    </div>
  );
}
