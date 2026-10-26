"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ALERT_ANIMATIONS, type AlertAnimation, type AlertPayload, type AlertStyle } from "@moom/shared/alerts";
import type { Locale } from "@moom/shared/i18n";
import { fmt } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { DEFAULT_LOOK, MAX_CSS, MAX_TIERS, MAX_TITLE, mediaKindOf, type StoredTier } from "@moom/shared/overlay/design";
import { ALERT_CSS_CLASSES, AlertBox } from "@moom/shared/ui/AlertBox";
import { Button, Field, Input, Panel, Select, Textarea } from "@moom/shared/ui/kit";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import { saveAlertDesign, sendTestAmount } from "../actions";
import { LookEditor } from "./LookEditor";

const MEDIA_TYPES = "image/png,image/jpeg,image/webp,image/gif,video/webm,video/mp4";
const SOUND_TYPES = "audio/mpeg,audio/ogg,audio/wav,audio/webm";
const MAX_UPLOAD = 10 * 1024 * 1024;

const CSS_EXAMPLE = `/* Bigger name, glowing amount, rounder card */
.moom-alert__name { color: #e0a13a; }
.moom-alert__amount { text-shadow: 0 0 8px #fff; }
.moom-alert--card { border-radius: 12px; }

/* Only the top tier */
.moom-alert[data-tier="2"] .moom-alert__title { font-size: 2em; }
`;

const blankTier = (min: number): StoredTier => ({
  min_amount: min,
  media_path: null,
  sound_path: null,
  title: "",
  accent: null,
  animation: "pop",
  style: null,
  look: null,
});

export function AlertDesignEditor({
  initialTiers,
  initialCss,
  urls: initialUrls,
  defaultStyle,
  accent,
  locale,
  userId,
  supabase,
}: {
  initialTiers: StoredTier[];
  initialCss: string;
  urls: Record<string, string>;
  defaultStyle: AlertStyle;
  accent: string;
  locale: Locale;
  userId: string;
  supabase: SupabasePublic;
}) {
  const { d } = useT();
  const [tiers, setTiers] = useState(initialTiers);
  const [css, setCss] = useState(initialCss);
  const [urls, setUrls] = useState(initialUrls);
  const [saved, setSaved] = useState<"idle" | "ok" | "error" | "not_ready">("idle");
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();

  const update = (i: number, patch: Partial<StoredTier>) => {
    setSaved("idle");
    setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  };

  const addTier = () => {
    setSaved("idle");
    setTiers((ts) => {
      const top = ts.reduce((m, t) => Math.max(m, t.min_amount), -1);
      return [...ts, blankTier(top < 0 ? 0 : top < 100 ? 100 : top * 5)];
    });
  };

  const save = () =>
    start(async () => {
      const r = await saveAlertDesign(tiers, css).catch(() => ({ ok: false, error: "network" }));
      if (!r) return; // the action redirected (session expired)
      setSaved(r.ok ? "ok" : r.error === "not_ready" ? "not_ready" : "error");
      // Keep the editor in the order the overlay uses.
      if (r.ok) setTiers((ts) => [...ts].sort((a, b) => a.min_amount - b.min_amount));
    });

  return (
    <div className="grid gap-5">
      <Panel
        title={d.design.tiers}
        aside={
          <Button size="sm" onClick={addTier} disabled={tiers.length >= MAX_TIERS}>
            + {d.design.add}
          </Button>
        }
      >
        <p className="mb-4 text-sm text-ink-soft">{d.design.tiersHint}</p>
        {tiers.length === 0 && <p className="bg-paper-2 p-3 text-sm text-ink-soft">{d.design.noTiers}</p>}
        <div className="grid gap-4">
          {tiers.map((t, i) => (
            <TierCard
              key={i}
              tier={t}
              index={i}
              urls={urls}
              defaultStyle={defaultStyle}
              accent={accent}
              locale={locale}
              testing={testing}
              onChange={(patch) => update(i, patch)}
              onRemove={() => {
                setSaved("idle");
                setTiers((ts) => ts.filter((_, j) => j !== i));
              }}
              onTest={() => startTest(() => sendTestAmount(Math.max(1, t.min_amount)).catch(() => {}))}
              onUpload={async (file, folder) => {
                if (file.size > MAX_UPLOAD) throw new Error("too big");
                const path = await uploadPublicMedia(supabase, userId, file, folder);
                setUrls((u) => ({ ...u, [path]: URL.createObjectURL(file) }));
                return path;
              }}
            />
          ))}
        </div>
      </Panel>

      <Panel title={d.design.css}>
        <p className="text-sm text-ink-soft">{d.design.cssHint}</p>
        <div className="my-2 flex flex-wrap gap-1.5">
          {ALERT_CSS_CLASSES.map((c) => (
            <code key={c} className="bg-paper-2 px-1.5 py-0.5 font-mono text-xs">
              {c}
            </code>
          ))}
        </div>
        <Textarea
          value={css}
          onChange={(e) => {
            setSaved("idle");
            setCss(e.target.value.slice(0, MAX_CSS));
          }}
          rows={10}
          spellCheck={false}
          className="font-mono text-sm"
          placeholder={CSS_EXAMPLE}
          aria-label={d.design.css}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-faint">
          <Button size="sm" variant="ghost" onClick={() => setCss((c) => (c ? `${c}\n\n${CSS_EXAMPLE}` : CSS_EXAMPLE))}>
            {d.design.cssExample}
          </Button>
          <span className="font-num">
            {css.length.toLocaleString()} / {MAX_CSS.toLocaleString()}
          </span>
        </div>
      </Panel>

      <div className="sticky bottom-3 flex items-center gap-3">
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? d.common.loading : d.common.save}
        </Button>
        {saved === "ok" && !pending && <span className="font-display text-leaf">✓ {d.design.savedLive}</span>}
        {saved === "error" && <span className="text-tomato">{d.common.error}</span>}
        {saved === "not_ready" && <span className="text-tomato">{d.design.notReady}</span>}
      </div>
    </div>
  );
}

function TierCard({
  tier: t,
  index,
  urls,
  defaultStyle,
  accent,
  locale,
  testing,
  onChange,
  onRemove,
  onTest,
  onUpload,
}: {
  tier: StoredTier;
  index: number;
  urls: Record<string, string>;
  defaultStyle: AlertStyle;
  accent: string;
  locale: Locale;
  testing: boolean;
  onChange: (patch: Partial<StoredTier>) => void;
  onRemove: () => void;
  onTest: () => void;
  onUpload: (file: File, folder: string) => Promise<string>;
}) {
  const { d } = useT();
  const [busy, setBusy] = useState<"media" | "sound" | null>(null);
  const [uploadError, setUploadError] = useState(false);
  const mediaUrl = t.media_path ? urls[t.media_path] : undefined;
  const soundUrl = t.sound_path ? urls[t.sound_path] : undefined;
  const kind = mediaKindOf(t.media_path);
  const id = `tier-${index}`;

  const upload = async (file: File | undefined, what: "media" | "sound") => {
    if (!file) return;
    setBusy(what);
    setUploadError(false);
    try {
      const path = await onUpload(file, what === "media" ? "alerts" : "sounds");
      onChange(what === "media" ? { media_path: path } : { sound_path: path });
    } catch {
      setUploadError(true);
    } finally {
      setBusy(null);
    }
  };

  const sample: AlertPayload = {
    name: d.alert.testName,
    amount: Math.max(1, t.min_amount),
    message: d.alert.testMessage,
    productTitle: null,
    media: null,
    tts: false,
    locale,
  };

  return (
    <div className="px-frame grid gap-4 bg-paper-2 p-4 lg:grid-cols-[1fr_minmax(0,420px)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="bg-ink px-2 py-0.5 font-display text-sm text-paper">
            {fmt(d.design.tierLabel, { n: index + 1 })}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="beak" onClick={onTest} disabled={testing}>
            {d.design.test}
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            {d.design.remove}
          </Button>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={d.design.minAmount} htmlFor={`${id}-min`}>
            <Input
              id={`${id}-min`}
              type="number"
              min={0}
              step="1"
              value={t.min_amount}
              onChange={(e) => onChange({ min_amount: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label={d.design.animation} htmlFor={`${id}-anim`}>
            <Select
              id={`${id}-anim`}
              value={t.animation}
              onChange={(e) => onChange({ animation: e.target.value as AlertAnimation })}
            >
              {ALERT_ANIMATIONS.map((a) => (
                <option key={a} value={a}>
                  {d.design.animations[a]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={d.design.accent} htmlFor={`${id}-accent`}>
            <div className="flex items-center gap-2">
              <input
                id={`${id}-accent`}
                type="color"
                value={t.accent ?? accent}
                onChange={(e) => onChange({ accent: e.target.value })}
                className="h-9 w-12 cursor-pointer border-[3px] border-ink bg-paper"
              />
              {t.accent ? (
                <Button size="sm" variant="ghost" onClick={() => onChange({ accent: null })}>
                  {d.design.accentDefault}
                </Button>
              ) : (
                <span className="text-sm text-ink-faint">{d.design.accentDefault}</span>
              )}
            </div>
          </Field>
        </div>

        <div className="mb-3">
          <div className="px-label">{d.design.lookMode}</div>
          <div className="flex flex-wrap gap-1" role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={!t.look}
              onClick={() => onChange({ look: null })}
              className={`px-btn px-btn-sm ${!t.look ? "px-btn-primary" : "px-btn-ghost"}`}
            >
              {d.design.lookPreset}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={Boolean(t.look)}
              onClick={() => onChange({ look: t.look ?? { ...DEFAULT_LOOK, colors: { ...DEFAULT_LOOK.colors, name: t.accent ?? accent } } })}
              className={`px-btn px-btn-sm ${t.look ? "px-btn-primary" : "px-btn-ghost"}`}
            >
              {d.design.lookCustom}
            </button>
          </div>
        </div>
        {t.look ? (
          <div className="mb-3 border-l-[3px] border-paper-3 pl-3">
            <LookEditor look={t.look} onChange={(look) => onChange({ look })} />
          </div>
        ) : (
          <Field label={d.design.style} htmlFor={`${id}-style`}>
            <Select
              id={`${id}-style`}
              value={t.style ?? ""}
              onChange={(e) => onChange({ style: (e.target.value || null) as AlertStyle | null })}
            >
              <option value="">{d.design.styleDefault}</option>
              {(["card", "compact", "banner"] as const).map((v) => (
                <option key={v} value={v}>
                  {d.overlay.alertStyles[v]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label={d.design.titleLabel} hint={d.design.titleHint} htmlFor={`${id}-title`}>
          <Input
            id={`${id}-title`}
            value={t.title}
            maxLength={MAX_TITLE}
            placeholder={d.design.titlePlaceholder}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>

        <Field label={d.design.media} hint={d.design.mediaHint}>
          <div className="flex flex-wrap items-center gap-2">
            <label className="px-btn px-btn-sm cursor-pointer">
              {busy === "media" ? "…" : d.design.upload}
              <input
                type="file"
                accept={MEDIA_TYPES}
                className="hidden"
                onChange={(e) => {
                  void upload(e.target.files?.[0], "media");
                  e.target.value = "";
                }}
              />
            </label>
            {t.media_path ? (
              <Button size="sm" variant="ghost" onClick={() => onChange({ media_path: null })}>
                {d.design.mediaNone}
              </Button>
            ) : (
              <span className="text-sm text-ink-faint">{d.design.mediaNone}</span>
            )}
          </div>
        </Field>

        <Field label={d.design.sound}>
          <div className="flex flex-wrap items-center gap-2">
            {soundUrl && <audio src={soundUrl} controls className="h-9" />}
            <label className="px-btn px-btn-sm cursor-pointer">
              {busy === "sound" ? "…" : d.design.upload}
              <input
                type="file"
                accept={SOUND_TYPES}
                className="hidden"
                onChange={(e) => {
                  void upload(e.target.files?.[0], "sound");
                  e.target.value = "";
                }}
              />
            </label>
            {t.sound_path ? (
              <Button size="sm" variant="ghost" onClick={() => onChange({ sound_path: null })}>
                {d.design.soundNone}
              </Button>
            ) : (
              <span className="text-sm text-ink-faint">{d.design.soundNone}</span>
            )}
          </div>
        </Field>
        {uploadError && <p className="text-sm text-tomato">{d.design.uploadFailed}</p>}
      </div>

      <div className="self-start lg:sticky lg:top-4">
        <div className="px-label">{d.design.preview}</div>
        <FitPreview naturalWidth={(t.look ? t.look.width : (t.style ?? defaultStyle) === "banner" ? 1100 : 560) + 48}>
          <div className={`px-in-${t.animation}`} key={`${t.animation}-${t.style}-${t.media_path}-${t.look?.layout}`}>
            <AlertBox
              kind="tip"
              payload={sample}
              accent={t.accent ?? accent}
              variant={t.style ?? defaultStyle}
              progress={0.6}
              className={t.look ? "" : "w-[560px]"}
              media={mediaUrl && kind ? { url: mediaUrl, kind } : null}
              title={t.title}
              tier={index}
              look={t.look}
            />
          </div>
        </FitPreview>
      </div>
    </div>
  );
}

/** Shows the alert at its real 1080p size, zoomed out to fit the column. */
function FitPreview({ naturalWidth, children }: { naturalWidth: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(420);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const zoom = Math.min(1, width / naturalWidth);
  return (
    <div ref={box} className="px-checker grid min-h-48 place-items-center overflow-hidden py-4">
      <div className="text-[18px]" style={{ zoom }}>
        {children}
      </div>
    </div>
  );
}
