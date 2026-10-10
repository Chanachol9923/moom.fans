"use client";
import { useState, useTransition } from "react";
import { PixelSprite } from "@/components/PixelSprite";
import { Button, Check, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { BACKGROUNDS, THEME_IDS, THEMES, type PageConfig } from "@/lib/page-config";
import { ICON_IDS, iconSprite } from "@/lib/pets/icons";
import type { PetSprite } from "@/lib/pets/sprites";
import { publicMediaUrl } from "@/lib/storage";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import type { Store } from "../../s/[slug]/data";
import { StoreView } from "../../s/[slug]/StoreView";
import { savePageConfig } from "../more-actions";

export function PageDesigner({
  store,
  initial,
  pets,
  userId,
  supabase,
}: {
  store: Store;
  initial: PageConfig;
  pets: Array<{ id: string; name: string; sprite: PetSprite | null }>;
  userId: string;
  supabase: SupabasePublic;
}) {
  const { d, locale } = useT();
  const [cfg, setCfg] = useState<PageConfig>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [bgBusy, setBgBusy] = useState(false);

  const set = <K extends keyof PageConfig>(k: K, v: PageConfig[K]) => {
    setSaved(false);
    setCfg((c) => ({ ...c, [k]: v }));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cfg.sections.length) return;
    const next = [...cfg.sections];
    [next[i], next[j]] = [next[j], next[i]];
    set("sections", next);
  };

  const previewStore: Store = {
    ...store,
    page: cfg,
    backgroundUrl: publicMediaUrl(cfg.backgroundImagePath),
    pet: pets.find((p) => p.id === cfg.petId)?.sprite ?? null,
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,420px)_1fr]">
      <div className="grid gap-5">
        <Panel title={d.page.theme}>
          <div className="grid grid-cols-5 gap-2">
            {THEME_IDS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("theme", t)}
                aria-pressed={cfg.theme === t}
                className={`p-1 text-center text-xs ${cfg.theme === t ? "outline-[3px] outline-ink outline-solid" : ""}`}
              >
                <span className="flex h-10 border-2 border-ink">
                  <span className="flex-1" style={{ background: THEMES[t].paper }} />
                  <span className="w-3" style={{ background: THEMES[t].ink }} />
                </span>
                <span className="mt-1 block font-display">{d.page.themeNames[t]}</span>
              </button>
            ))}
          </div>
          <Field label={d.page.background}>
            <div className="flex flex-wrap gap-1">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`px-btn px-btn-sm ${cfg.background === b ? "px-btn-primary" : ""}`}
                  onClick={() => set("background", b)}
                >
                  {d.page.backgroundNames[b]}
                </button>
              ))}
            </div>
          </Field>
          {cfg.background === "image" && (
            <label className="px-btn px-btn-sm cursor-pointer">
              {bgBusy ? "…" : d.page.backgroundUpload}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBgBusy(true);
                  try {
                    set("backgroundImagePath", await uploadPublicMedia(supabase, userId, f, "background"));
                  } finally {
                    setBgBusy(false);
                  }
                }}
              />
            </label>
          )}
          <Field label={d.page.frameColor}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cfg.frameColor ?? THEMES[cfg.theme].ink}
                onChange={(e) => set("frameColor", e.target.value)}
                className="h-9 w-12 cursor-pointer"
              />
              {cfg.frameColor && (
                <Button type="button" size="sm" variant="ghost" onClick={() => set("frameColor", null)}>
                  {d.page.frameDefault}
                </Button>
              )}
            </div>
          </Field>
          {pets.length > 0 && (
            <Field label={d.page.pet}>
              <Select value={cfg.petId ?? ""} onChange={(e) => set("petId", e.target.value || null)}>
                <option value="">{d.page.petNone}</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </Panel>

        <Panel title={d.page.texts}>
          <Field label={d.page.tipTitle}>
            <Input value={cfg.tipTitle} maxLength={60} placeholder={d.store.tipTitle} onChange={(e) => set("tipTitle", e.target.value)} />
          </Field>
          <Field label={d.page.tipNote}>
            <Textarea value={cfg.tipNote} maxLength={300} rows={2} onChange={(e) => set("tipNote", e.target.value)} />
          </Field>
          <Field label={d.page.buttonLabel}>
            <Input value={cfg.buttonLabel} maxLength={30} placeholder={d.store.send} onChange={(e) => set("buttonLabel", e.target.value)} />
          </Field>
          <Field label={d.page.thanks}>
            <Textarea value={cfg.thanksMessage} maxLength={300} rows={2} placeholder={d.pay.statusVerifiedTip} onChange={(e) => set("thanksMessage", e.target.value)} />
          </Field>
        </Panel>

        <Panel title={d.page.sections}>
          <ul className="grid gap-1">
            {cfg.sections.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 bg-paper-2 px-2 py-1">
                <input
                  type="checkbox"
                  checked={s.visible}
                  aria-label={d.page.visible}
                  onChange={(e) => set("sections", cfg.sections.map((x) => (x.id === s.id ? { ...x, visible: e.target.checked } : x)))}
                />
                <span className="flex-1 font-display">{d.page.sectionNames[s.id]}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} aria-label={d.page.up}>
                  ↑
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} aria-label={d.page.down}>
                  ↓
                </Button>
              </li>
            ))}
          </ul>
          <Field label={d.page.focus}>
            <Select value={cfg.focus} onChange={(e) => set("focus", e.target.value as PageConfig["focus"])}>
              <option value="tip">{d.page.focusTip}</option>
              <option value="shop">{d.page.focusShop}</option>
            </Select>
          </Field>
        </Panel>

        <Panel title={d.page.wall}>
          <Check checked={cfg.wall.showAmounts} onChange={(e) => set("wall", { ...cfg.wall, showAmounts: e.target.checked })} label={d.page.showAmounts} />
          <div className="grid grid-cols-3 gap-3">
            <Field label={d.page.recentCount}>
              <Input type="number" min={0} max={20} value={cfg.wall.recentCount} onChange={(e) => set("wall", { ...cfg.wall, recentCount: clamp(e.target.value, 0, 20) })} />
            </Field>
            <Field label={d.page.topCount}>
              <Input type="number" min={0} max={10} value={cfg.wall.topCount} onChange={(e) => set("wall", { ...cfg.wall, topCount: clamp(e.target.value, 0, 10) })} />
            </Field>
            <Field label={d.page.topPeriod}>
              <Select value={cfg.wall.topPeriod} onChange={(e) => set("wall", { ...cfg.wall, topPeriod: e.target.value as "30d" | "all" })}>
                <option value="30d">{d.page.period30d}</option>
                <option value="all">{d.page.periodAll}</option>
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title={d.page.unit}>
          <p className="mb-2 text-sm text-ink-soft">{d.page.unitHint}</p>
          <Check checked={cfg.unit.enabled} onChange={(e) => set("unit", { ...cfg.unit, enabled: e.target.checked })} label={d.page.unitEnabled} />
          {cfg.unit.enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={d.page.unitName}>
                  <Input value={cfg.unit.name} maxLength={20} onChange={(e) => set("unit", { ...cfg.unit, name: e.target.value || cfg.unit.name })} />
                </Field>
                <Field label={d.page.unitPrice}>
                  <Input type="number" min={1} value={cfg.unit.price} onChange={(e) => set("unit", { ...cfg.unit, price: Math.max(1, Number(e.target.value) || 1) })} />
                </Field>
              </div>
              <Field label={d.page.unitIcon}>
                <div className="flex gap-2">
                  {ICON_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set("unit", { ...cfg.unit, icon: id })}
                      aria-pressed={cfg.unit.icon === id}
                      className={`p-1 ${cfg.unit.icon === id ? "bg-ink/15 outline-[3px] outline-ink outline-solid" : ""}`}
                    >
                      <PixelSprite sprite={iconSprite(id)} size={32} />
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={d.page.unitPresets}>
                <Input
                  defaultValue={cfg.unit.presets.join(", ")}
                  onBlur={(e) => {
                    const list = [...new Set(e.target.value.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 1000))].slice(0, 5);
                    if (list.length) set("unit", { ...cfg.unit, presets: list });
                  }}
                />
              </Field>
            </>
          )}
        </Panel>

        <div className="sticky bottom-3 flex items-center gap-3">
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await savePageConfig(cfg);
                setSaved(r.ok);
              })
            }
          >
            {pending ? d.common.loading : d.common.save}
          </Button>
          {saved && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
        </div>
      </div>

      <div className="xl:sticky xl:top-4">
        <div className="px-label">{d.page.preview}</div>
        <div className="px-frame max-h-[85vh] overflow-auto">
          <div className="pointer-events-auto origin-top-left">
            <StoreView store={previewStore} d={d} locale={locale} preview />
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(v: string, min: number, max: number) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}
