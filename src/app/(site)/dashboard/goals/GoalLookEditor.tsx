"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { googleFontsHref } from "@moom/shared/fonts";
import { DEFAULT_GOAL_LOOK, GOAL_PRESETS, MAX_GOAL_CSS, type GoalLook } from "@moom/shared/goal-look";
import type { Locale } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import type { SavedPreset } from "@moom/shared/presets";
import { FontPicker } from "@moom/shared/ui/FontPicker";
import { GoalBar } from "@moom/shared/ui/GoalBar";
import { Button, Check, Field, Textarea } from "@moom/shared/ui/kit";
import { errorText, isNextControl } from "@/lib/errors";
import { publicMediaUrl } from "@/lib/storage";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import { MAX_GIF_BYTES, mediaKindOf } from "@moom/shared/overlay/design";
import { Choice, Slider } from "../alerts/LookEditor";
import { saveGoalLook } from "../more-actions";
import { PresetBar } from "../PresetBar";

type Sample = { title: string; raised: number; target: number; endsAt: string | null };

/** Everything about the OBS goal bar, with a live preview at its real size. */
export function GoalLookEditor({
  initial,
  presets: initialPresets,
  sample,
  accent,
  locale,
  brandFont,
  userId,
  supabase,
}: {
  initial: GoalLook | null;
  presets: SavedPreset[];
  sample: Sample;
  accent: string;
  locale: Locale;
  brandFont: boolean;
  userId: string;
  supabase: SupabasePublic;
}) {
  const { d } = useT();
  const G = d.goalLook;
  const [look, setLook] = useState<GoalLook>(initial ?? DEFAULT_GOAL_LOOK);
  const [presets, setPresets] = useState(initialPresets);
  const [status, setStatus] = useState<"saved" | string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<GoalLook>) => {
    setStatus(null);
    setLook((l) => ({ ...l, ...patch }));
  };
  const color = (k: keyof GoalLook["colors"], v: string | number) => set({ colors: { ...look.colors, [k]: v } });
  const show = (k: keyof GoalLook["show"], v: boolean) => set({ show: { ...look.show, [k]: v } });

  const save = (value: GoalLook | null) =>
    start(async () => {
      try {
        const r = await saveGoalLook(value);
        if (!r) return;
        setStatus(r.ok ? "saved" : errorText(r.error, d));
      } catch (e) {
        if (isNextControl(e)) throw e;
        setStatus(d.common.errNetwork);
      }
    });

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const imageUrl = look.image ? (localUrl ?? publicMediaUrl(look.image)) : null;
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setUploadErr(null);
    if (f.size > MAX_GIF_BYTES) return setUploadErr(d.common.errTooBig);
    setUploading(true);
    try {
      const path = await uploadPublicMedia(supabase, userId, f, "goals");
      setLocalUrl(URL.createObjectURL(f));
      set({ image: path });
    } catch (err) {
      setUploadErr(errorText((err as Error).message, d));
    } finally {
      setUploading(false);
    }
  };

  const fonts = googleFontsHref([look.font, look.numFont]);
  const builtins = (Object.keys(GOAL_PRESETS) as Array<keyof typeof GOAL_PRESETS>).map((k) => ({ name: G.presetNames[k], look: GOAL_PRESETS[k] }));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      {fonts && <link key={fonts} rel="stylesheet" href={fonts} />}
      <div className="grid content-start gap-3">
        <PresetBar kind="goal" builtins={builtins} saved={presets} onSaved={setPresets} current={look} onApply={(l) => set(l)} />

        <Choice label={G.bar} value={look.bar} options={G.bars} onChange={(bar) => set({ bar })} />
        <Choice label={G.layout} value={look.layout} options={G.layouts} onChange={(layout) => set({ layout })} />
        <Choice label={G.frame} value={look.frame} options={d.design.look.frames} onChange={(frame) => set({ frame })} />
        <Choice label={G.shadow} value={look.shadow} options={d.design.look.shadows} onChange={(shadow) => set({ shadow })} />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={G.titleFont} htmlFor="goal-font">
            <FontPicker id="goal-font" value={look.font} onChange={(font) => set({ font })} builtins={["pixel", "display", "body"]} brand={brandFont} />
          </Field>
          <Field label={G.numFont} htmlFor="goal-numfont">
            <FontPicker id="goal-numfont" value={look.numFont} onChange={(numFont) => set({ numFont })} builtins={["pixel", "display", "body"]} brand={brandFont} />
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Slider label={G.scale} value={look.scale} min={0.6} max={2.5} step={0.05} show={`${Math.round(look.scale * 100)}%`} onChange={(scale) => set({ scale })} />
          <Slider label={G.barHeight} value={look.barHeight} min={4} max={64} step={1} show={`${look.barHeight}px`} onChange={(barHeight) => set({ barHeight })} />
          {look.bar === "segments" && (
            <Slider label={G.segments} value={look.segments} min={6} max={60} step={1} show={String(look.segments)} onChange={(segments) => set({ segments })} />
          )}
          <Slider label={G.weight} value={look.weight} min={300} max={900} step={100} show={String(look.weight)} onChange={(weight) => set({ weight })} />
          {look.frame === "rounded" && (
            <Slider label={G.radius} value={look.radius} min={0} max={60} step={1} show={`${look.radius}px`} onChange={(radius) => set({ radius })} />
          )}
          <Slider label={G.bgAlpha} value={look.colors.bgAlpha} min={0} max={100} step={5} show={`${look.colors.bgAlpha}%`} onChange={(v) => color("bgAlpha", v)} />
        </div>

        <div>
          <div className="px-label">{G.colors}</div>
          <div className="flex flex-wrap gap-3">
            {(["bg", "border", "title", "text", "track"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1.5 text-sm">
                <input type="color" value={look.colors[k]} onChange={(e) => color(k, e.target.value)} className="h-8 w-10 cursor-pointer border-[3px] border-ink bg-paper" />
                {G.colorNames[k]}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="color"
                value={look.colors.fill || accent}
                onChange={(e) => color("fill", e.target.value)}
                className="h-8 w-10 cursor-pointer border-[3px] border-ink bg-paper"
              />
              {G.colorNames.fill}
            </label>
          </div>
          {look.colors.fill && (
            <button type="button" className="mt-1 text-sm underline" onClick={() => color("fill", "")}>
              {G.fillAccount}
            </button>
          )}
        </div>

        <div className="grid gap-2 border-y-[3px] border-dashed border-ink/15 py-3">
          <div className="px-label">{G.image}</div>
          <div className="flex flex-wrap items-center gap-2">
            {imageUrl &&
              (mediaKindOf(look.image) === "video" ? (
                <video src={imageUrl} className="h-12 w-auto bg-paper-2" muted autoPlay loop playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- streamer upload
                <img src={imageUrl} alt="" className="h-12 w-auto bg-paper-2" />
              ))}
            <label className="px-btn px-btn-sm cursor-pointer">
              {uploading ? d.common.uploading : look.image ? G.imageChange : G.imageAdd}
              <input
                type="file"
                accept="image/gif,image/webp,image/png,image/jpeg,video/webm,video/mp4"
                className="hidden"
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {look.image && (
              <Button size="sm" variant="ghost" onClick={() => set({ image: null })}>
                {G.imageRemove}
              </Button>
            )}
          </div>
          {uploadErr && <p className="text-sm text-tomato">{uploadErr}</p>}
          {!look.image && <p className="text-sm text-ink-faint">{G.imageHint}</p>}
          {look.image && (
            <>
              <Choice label={G.imagePlace} value={look.imagePlace} options={G.imagePlaces} onChange={(imagePlace) => set({ imagePlace })} />
              <div className="grid gap-x-4 sm:grid-cols-2">
                {look.imagePlace !== "behind" ? (
                  <Slider label={G.imageSize} value={look.imageSize} min={16} max={400} step={2} show={`${look.imageSize}px`} onChange={(imageSize) => set({ imageSize })} />
                ) : (
                  <>
                    <Slider label={d.design.look.imageX} value={look.imageX} min={0} max={100} step={1} show={`${look.imageX}%`} onChange={(imageX) => set({ imageX })} />
                    <Slider label={d.design.look.imageY} value={look.imageY} min={0} max={100} step={1} show={`${look.imageY}%`} onChange={(imageY) => set({ imageY })} />
                    <Slider label={d.design.look.imageZoom} value={look.imageZoom} min={1} max={4} step={0.05} show={`${Math.round(look.imageZoom * 100)}%`} onChange={(imageZoom) => set({ imageZoom })} />
                    <Slider label={G.imageOpacity} value={look.imageOpacity} min={5} max={100} step={5} show={`${look.imageOpacity}%`} onChange={(imageOpacity) => set({ imageOpacity })} />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-x-5">
          <Check label={G.show.title} checked={look.show.title} onChange={(e) => show("title", e.target.checked)} />
          <Check label={G.show.percent} checked={look.show.percent} onChange={(e) => show("percent", e.target.checked)} />
          <Check label={G.show.amounts} checked={look.show.amounts} onChange={(e) => show("amounts", e.target.checked)} />
          <Check label={G.show.deadline} checked={look.show.deadline} onChange={(e) => show("deadline", e.target.checked)} />
          <Check label={d.design.look.outline} checked={look.outline} onChange={(e) => set({ outline: e.target.checked })} />
        </div>

        <details>
          <summary className="cursor-pointer font-display">{G.css}</summary>
          <Field label={G.css} htmlFor="goal-css" hint={G.cssHint}>
            <Textarea
              id="goal-css"
              rows={5}
              maxLength={MAX_GOAL_CSS}
              className="font-mono text-sm"
              value={look.css.replace(/\\3c /g, "<")}
              onChange={(e) => set({ css: e.target.value })}
              spellCheck={false}
            />
          </Field>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={pending} onClick={() => save(look)}>
            {pending ? d.common.loading : d.common.save}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => save(null)}>
            {G.useClassic}
          </Button>
          {status === "saved" && <span className="font-display text-leaf">✓ {G.saved}</span>}
          {status && status !== "saved" && <span className="text-tomato">{status}</span>}
        </div>
      </div>

      <div className="self-start lg:sticky lg:top-4">
        <div className="px-label">{G.preview}</div>
        <FitWidth width={800}>
          <GoalBar {...sample} accent={accent} d={d} locale={locale} look={{ ...look, css: "" }} imageUrl={imageUrl} />
        </FitWidth>
        <p className="mt-2 text-sm text-ink-faint">{G.previewHint}</p>
      </div>
    </div>
  );
}

/** The widget at its real Browser Source width, shrunk to fit the column. */
function FitWidth({ width, children }: { width: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className="px-checker overflow-hidden p-0">
      <div style={{ width, zoom: scale }} className="p-3 text-[18px]">
        {children}
      </div>
    </div>
  );
}
