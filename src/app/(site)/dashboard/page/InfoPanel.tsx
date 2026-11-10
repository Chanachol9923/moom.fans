"use client";
import { Button, Field, Input, Panel, Textarea } from "@moom/shared/ui/kit";
import type { Dict } from "@moom/shared/i18n";
import { MAX_LINKS, MAX_PRESETS, normalizeUrl, type PageInfo } from "@/lib/profile-info";

/**
 * Name, about text, links, channel colour and tip amounts: what fans read on the page.
 * Every change shows in the preview at once; Save in Page design stores it.
 */
export function InfoPanel({
  d,
  info,
  onChange,
  error,
}: {
  d: Dict;
  info: PageInfo;
  onChange: (patch: Partial<PageInfo>) => void;
  error?: string | null;
}) {
  const P = d.page;
  const setLink = (i: number, patch: Partial<PageInfo["links"][number]>) =>
    onChange({ links: info.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <Panel title={P.infoTitle}>
      <p className="mb-3 text-sm text-ink-soft">{P.infoHint}</p>

      <Field label={d.onboarding.displayName} htmlFor="info-name" error={error === "name" ? P.nameNeeded : undefined}>
        <Input
          id="info-name"
          value={info.displayName}
          maxLength={60}
          onChange={(e) => onChange({ displayName: e.target.value })}
        />
      </Field>

      <Field label={d.settings.bio} hint={`${info.bio.length}/500`} htmlFor="info-bio">
        <Textarea id="info-bio" value={info.bio} maxLength={500} rows={3} onChange={(e) => onChange({ bio: e.target.value })} />
      </Field>

      <div className="px-label">{d.settings.links}</div>
      <p className="mb-2 text-sm text-ink-soft">{P.linksHint}</p>
      <ul className="mb-2 grid gap-2">
        {info.links.map((l, i) => {
          const bad = l.url.trim() !== "" && !normalizeUrl(l.url);
          return (
            <li key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-start gap-1.5">
              <Input
                value={l.label}
                maxLength={40}
                placeholder={P.linkNamePh}
                aria-label={P.linkName}
                onChange={(e) => setLink(i, { label: e.target.value })}
              />
              <div className="min-w-0">
                <Input
                  value={l.url}
                  maxLength={500}
                  inputMode="url"
                  placeholder="youtube.com/@name"
                  aria-label={P.linkUrl}
                  aria-invalid={bad || undefined}
                  className={bad ? "border-tomato" : undefined}
                  onChange={(e) => setLink(i, { url: e.target.value })}
                />
                {bad && <p className="mt-0.5 text-xs text-tomato">{P.linkBad}</p>}
              </div>
              <button
                type="button"
                className="px-btn px-btn-sm"
                aria-label={P.linkRemove}
                title={P.linkRemove}
                onClick={() => onChange({ links: info.links.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      {info.links.length < MAX_LINKS && (
        <Button type="button" size="sm" className="mb-4" onClick={() => onChange({ links: [...info.links, { label: "", url: "" }] })}>
          + {P.linkAdd}
        </Button>
      )}

      <div className="px-label">{d.settings.tipPresets}</div>
      <p className="mb-2 text-sm text-ink-soft">{P.presetsHint}</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {info.tipPresets.map((n, i) => (
          <span key={i} className="flex items-center">
            <span className="font-num mr-1 text-ink-soft">฿</span>
            <Input
              type="number"
              min={1}
              max={100000}
              value={n || ""}
              aria-label={`${d.settings.tipPresets} ${i + 1}`}
              className="font-num w-20"
              onChange={(e) => onChange({ tipPresets: info.tipPresets.map((x, j) => (j === i ? Math.floor(Number(e.target.value)) : x)) })}
            />
            {info.tipPresets.length > 1 && (
              <button
                type="button"
                className="px-1 text-ink-soft hover:text-tomato"
                aria-label={P.presetRemove}
                title={P.presetRemove}
                onClick={() => onChange({ tipPresets: info.tipPresets.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {info.tipPresets.length < MAX_PRESETS && (
          <Button
            type="button"
            size="sm"
            onClick={() => onChange({ tipPresets: [...info.tipPresets, (Math.max(0, ...info.tipPresets) || 50) * 2] })}
          >
            + {P.presetAdd}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={d.settings.minTip} hint={P.minTipHint} htmlFor="info-min">
          <Input
            id="info-min"
            type="number"
            min={1}
            max={100000}
            value={info.minTip || ""}
            className="font-num"
            onChange={(e) => onChange({ minTip: Math.max(0, Math.floor(Number(e.target.value))) })}
          />
        </Field>
        <Field label={d.settings.accent} hint={P.accentHint} htmlFor="info-accent">
          <input
            id="info-accent"
            type="color"
            value={info.accent}
            onChange={(e) => onChange({ accent: e.target.value })}
            className="h-10 w-full cursor-pointer border-[3px] border-ink bg-paper"
          />
        </Field>
      </div>
    </Panel>
  );
}
