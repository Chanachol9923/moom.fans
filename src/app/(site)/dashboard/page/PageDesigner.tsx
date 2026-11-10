"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import {
  Button,
  Check,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import type { Dict } from "@moom/shared/i18n";
import {
  BACKGROUNDS,
  MAX_PAGE_CSS,
  THEME_IDS,
  THEMES,
  type PageConfig,
} from "@/lib/page-config";
import { ICON_IDS, iconSprite } from "@moom/shared/pets/icons";
import type { PetSprite } from "@moom/shared/pets/sprites";
import { publicMediaUrl } from "@/lib/storage";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import type { Store } from "../../s/[slug]/data";
import { StoreView, type InlineField, type PictureSpot } from "../../s/[slug]/StoreView";
import { savePageConfig } from "../more-actions";
import { FontPicker } from "@moom/shared/ui/FontPicker";
import { errorText } from "@/lib/errors";
import { sampleProducts } from "@/lib/sample-store";
import { flatBoxes, MAX_TEXTS, normalizeGrid, presetGrid, updateBox, type Grid, type TextBoxId } from "@/lib/page-grid";
import type { TextBox } from "@/lib/page-config";
import { boxName } from "./box-name";
import { TextsPanel } from "./TextsPanel";
import { useArrange } from "./Arrange";
import Link from "next/link";
import { Choice, Slider } from "../alerts/LookEditor";
import { UnitIcon } from "@moom/shared/ui/UnitIcon";
import { MAX_GIF_BYTES, mediaKindOf } from "@moom/shared/overlay/design";
import { normalizeLinks, normalizePresets, type PageInfo } from "@/lib/profile-info";
import { InfoPanel } from "./InfoPanel";

export function PageDesigner({
  store,
  initial,
  initialPictures,
  initialInfo,
  pets,
  userId,
  supabase,
}: {
  store: Store;
  initial: PageConfig;
  initialPictures: Pictures;
  initialInfo: PageInfo;
  pets: Array<{ id: string; name: string; sprite: PetSprite | null }>;
  userId: string;
  supabase: SupabasePublic;
}) {
  const { d, locale } = useT();
  const [cfg, setCfg] = useState<PageConfig>(initial);
  const [pics, setPics] = useState<Pictures>(initialPictures);
  const [info, setInfo] = useState<PageInfo>(initialInfo);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [full, setFull] = useState(false);
  // Desktop first: it's where columns and arranging make sense; phone is one click away.
  const [device, setDevice] = useState<Device>("desktop");
  const [arrange, setArrange] = useState(false);
  // Preview only: fills an empty shop with made-up products to see how it would look.
  const [demoShop, setDemoShop] = useState(false);
  const noProducts = store.products.length === 0;
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<Slot | null>(null);
  const [upErr, setUpErr] = useState<Partial<Record<Slot, string>>>({});
  const [unitBusy, setUnitBusy] = useState(false);
  const [unitErr, setUnitErr] = useState<string | null>(null);
  const [fontBusy, setFontBusy] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);

  const touch = () => {
    setSaved(false);
    setDirty(true);
  };
  const set = <K extends keyof PageConfig>(k: K, v: PageConfig[K]) => {
    touch();
    setCfg((c) => ({ ...c, [k]: v }));
  };
  /** Merge into one of the grouped settings (header, colours, ...) from the latest state. */
  const setPart = <K extends "header" | "bgImage" | "colors" | "wall" | "unit" | "bannerImage" | "avatarImage">(
    k: K,
    patch: Partial<PageConfig[K]>,
  ) => {
    touch();
    setCfg((c) => ({ ...c, [k]: { ...c[k], ...patch } }));
  };
  // Functional update: two quick changes in a row must not overwrite each other.
  const setFonts = (patch: Partial<PageConfig["fonts"]>) => {
    touch();
    setCfg((c) => ({ ...c, fonts: { ...c.fonts, ...patch } }));
  };
  const updateGrid = (fn: (g: Grid) => Grid) => {
    touch();
    setCfg((c) => ({ ...c, grid: fn(c.grid) }));
  };

  const setInfoPart = (patch: Partial<PageInfo>) => {
    touch();
    setInfo((i) => ({ ...i, ...patch }));
  };

  const setPic = (k: keyof Pictures, path: string | null) => {
    touch();
    setPics((p) => ({ ...p, [k]: path }));
  };

  /** Profile, cover and background pictures share one upload path. */
  const upload = async (slot: Slot, f: File) => {
    setUpErr((e) => ({ ...e, [slot]: undefined }));
    if (f.size > MAX_PICTURE_BYTES) return setUpErr((e) => ({ ...e, [slot]: d.common.errTooBig }));
    setBusy(slot);
    try {
      const path = await uploadPublicMedia(supabase, userId, f, slot);
      if (slot === "background") {
        touch();
        // Uploading a background means they want to see it.
        setCfg((c) => ({ ...c, backgroundImagePath: path, background: "image" }));
      } else setPic(slot === "avatar" ? "avatarPath" : "bannerPath", path);
    } catch (err) {
      setUpErr((e) => ({ ...e, [slot]: errorText((err as Error).message, d) }));
    } finally {
      setBusy(null);
    }
  };

  // Leaving with unsaved changes asks first; Esc leaves full screen.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [full]);

  const { edit, overlay } = useArrange({ d, grid: cfg.grid, texts: cfg.texts, wide: device === "desktop", update: updateGrid });

  // Text boxes: adding one puts it at the end of the page, removing it takes it out of the layout.
  const addText = () => {
    if (cfg.texts.length >= MAX_TEXTS) return;
    touch();
    const id = `text-${Math.random().toString(36).slice(2, 10)}` as TextBoxId;
    // Show it on the preview with the cursor in its title, ready to type.
    setFocusBox({ id, type: true });
    setCfg((c) => {
      if (c.texts.length >= MAX_TEXTS) return c;
      const texts: TextBox[] = [...c.texts, { id, title: "", body: "", look: "card", align: "left", size: "m", image: null, imagePlace: "top" }];
      return { ...c, texts, grid: normalizeGrid(c.grid, texts.map((t) => t.id)) };
    });
  };
  const changeText = (id: string, patch: Partial<TextBox>) => {
    touch();
    setCfg((c) => ({ ...c, texts: c.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  };
  const [textBusy, setTextBusy] = useState<string | null>(null);
  const [textErr, setTextErr] = useState<Record<string, string | undefined>>({});
  const uploadTextPicture = async (id: string, f: File) => {
    setTextErr((e) => ({ ...e, [id]: undefined }));
    if (f.size > MAX_PICTURE_BYTES) return setTextErr((e) => ({ ...e, [id]: d.common.errTooBig }));
    setTextBusy(id);
    try {
      changeText(id, { image: await uploadPublicMedia(supabase, userId, f, "texts") });
    } catch (err) {
      setTextErr((e) => ({ ...e, [id]: errorText((err as Error).message, d) }));
    } finally {
      setTextBusy(null);
    }
  };
  const removeText = (id: string) => {
    touch();
    setCfg((c) => {
      const texts = c.texts.filter((t) => t.id !== id);
      return { ...c, texts, grid: normalizeGrid(c.grid, texts.map((t) => t.id)) };
    });
  };
  /** The camera buttons on the preview: pick a file and it uploads like the panels do. */
  const pictureButton = (spot: PictureSpot) => {
    const text = spot.startsWith("text-");
    const label = d.page.picEdit[text ? "text" : (spot as Slot)];
    const working = text ? textBusy === spot : busy === spot;
    return (
      <label
        title={label}
        aria-label={label}
        // Same size on screen whatever the preview's zoom.
        style={{ zoom: "calc(1 / var(--pz, 1))" }}
        className={`px-btn px-btn-sm flex items-center gap-1.5 ${working ? "cursor-wait" : "cursor-pointer"}`}
      >
        {working ? <span className="font-num">…</span> : <CameraIcon />}
        {(spot === "background" || spot === "banner") && <span>{label}</span>}
        <input
          type="file"
          accept={spot === "banner" ? MEDIA_TYPES : text ? "image/png,image/jpeg,image/webp,image/gif" : IMAGE_TYPES}
          className="hidden"
          disabled={working}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (text) void uploadTextPicture(spot, f);
            else void upload(spot as Slot, f);
          }}
        />
      </label>
    );
  };
  const pictureError = Object.values(upErr).find(Boolean) ?? Object.values(textErr).find(Boolean);

  // Columns only show on a wide page, so arranging starts on the desktop view.
  const toggleArrange = () => {
    if (!arrange && device !== "desktop") setDevice("desktop");
    setArrange(!arrange);
  };
  // Double-click anywhere on the preview: start arranging, with the box that was clicked in view.
  const [focusBox, setFocusBox] = useState<{ id: string; type?: boolean } | null>(null);
  const arrangeAt = (e: React.MouseEvent<HTMLElement>) => {
    if (arrange) return;
    window.getSelection()?.removeAllRanges();
    const id = (e.target as HTMLElement).closest<HTMLElement>("[data-box]")?.dataset.box;
    setFocusBox(id ? { id } : null);
    if (device !== "desktop") setDevice("desktop");
    setArrange(true);
  };
  useEffect(() => {
    if ((!arrange && !focusBox?.type) || !focusBox) return;
    const el = document.querySelector<HTMLElement>(`[data-zoom] [data-box="${CSS.escape(focusBox.id)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.animate([{ transform: "scale(1.03)" }, { transform: "none" }], { duration: 350, easing: "ease-out" });
    if (focusBox.type) el.querySelector<HTMLElement>("[contenteditable]")?.focus({ preventScroll: true });
  }, [arrange, focusBox, cfg.texts.length]);

  /** Typing on the preview writes to the same state as the panels on the left. */
  const inlineText = (field: InlineField, value: string) => {
    if (field === "name") {
      return <InlineText value={info.displayName} placeholder={d.page.inlineName} max={60} onChange={(v) => setInfoPart({ displayName: v })} />;
    }
    if (field === "bio") {
      return <InlineText value={info.bio} placeholder={d.page.inlineBio} max={500} multiline onChange={(v) => setInfoPart({ bio: v })} />;
    }
    const [id, part] = field.split(".") as [string, "title" | "body"];
    return part === "title" ? (
      <InlineText value={value} placeholder={d.page.textTitlePh} max={80} onChange={(v) => changeText(id, { title: v })} />
    ) : (
      <InlineText value={value} placeholder={d.page.textBodyPh} max={3000} multiline onChange={(v) => changeText(id, { body: v })} />
    );
  };

  const avatarUrl = publicMediaUrl(pics.avatarPath);
  const bannerUrl = publicMediaUrl(pics.bannerPath);
  const bgUrl = publicMediaUrl(cfg.backgroundImagePath);

  const previewStore: Store = {
    ...store,
    displayName: info.displayName.trim() || store.displayName,
    bio: info.bio,
    accent: info.accent,
    links: normalizeLinks(info.links),
    tipPresets: normalizePresets(info.tipPresets),
    minTip: info.minTip || 1,
    avatarUrl,
    bannerUrl,
    products: noProducts && demoShop ? sampleProducts(locale) : store.products,
    page: cfg,
    backgroundUrl: bgUrl,
    pet: pets.find((p) => p.id === cfg.petId)?.sprite ?? null,
    brandFontUrl: publicMediaUrl(cfg.brandFontPath),
  };

  const uploadFont = async (f: File) => {
    setFontError(null);
    if (f.size > 2 * 1024 * 1024) return setFontError(d.fonts.brandTooBig);
    // Browsers often leave font files untyped; storage only takes known types.
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const type = {
      woff2: "font/woff2",
      woff: "font/woff",
      ttf: "font/ttf",
      otf: "font/otf",
    }[ext];
    if (!type) return setFontError(d.design.uploadFailed);
    setFontBusy(true);
    try {
      const path = await uploadPublicMedia(
        supabase,
        userId,
        new File([f], f.name, { type }),
        "fonts",
      );
      set("brandFontPath", path);
      // Picking it right away is what people expect after uploading.
      setCfg((c) =>
        c.fonts.heading === "default"
          ? { ...c, fonts: { ...c.fonts, heading: "brand" } }
          : c,
      );
    } catch (err) {
      setFontError(errorText((err as Error).message, d));
    } finally {
      setFontBusy(false);
    }
  };

  // minmax(0, …) everywhere: the desktop preview is 1280 px wide inside and must not
  // widen the column it is measured against.
  return (
    <div
      // data-wide-page lets the dashboard shell grow wider for this editor.
      data-wide-page
      className={
        full
          ? "fixed inset-0 z-[70] grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-4 bg-paper p-3 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]"
          : "grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]"
      }
    >
      <div className={full ? "hidden min-h-0 min-w-0 content-start gap-5 overflow-y-auto pr-1 xl:grid" : "grid min-w-0 gap-5"}>
        <InfoPanel d={d} info={info} onChange={setInfoPart} error={saveErr} />

        <Panel title={d.page.pictures}>
          <p className="mb-3 text-sm text-ink-soft">{d.page.picturesHint}</p>
          <div className="grid gap-4">
            <PictureSlot
              label={d.page.avatarPic}
              hint={d.page.avatarPicHint}
              url={avatarUrl}
              accept={IMAGE_TYPES}
              busy={busy === "avatar"}
              error={upErr.avatar}
              onFile={(f) => void upload("avatar", f)}
              onRemove={() => setPic("avatarPath", null)}
              frameClass={`size-24 ${cfg.header.avatar === "round" ? "rounded-full" : cfg.header.avatar === "rounded" ? "rounded-[22%]" : ""}`}
              place={cfg.avatarImage}
              onPlace={(v) => setPart("avatarImage", v)}
            >
              <Choice label={d.page.avatar} value={cfg.header.avatar} options={d.page.avatars} onChange={(avatar) => setPart("header", { avatar })} />
              {cfg.header.avatar !== "hidden" && (
                <>
                  <Choice
                    label={d.page.avatarSize}
                    value={cfg.header.avatarSize}
                    options={d.page.avatarSizes}
                    onChange={(avatarSize) => setPart("header", { avatarSize })}
                  />
                  <Check
                    label={d.page.avatarBorder}
                    checked={cfg.header.avatarBorder}
                    onChange={(e) => setPart("header", { avatarBorder: e.target.checked })}
                  />
                </>
              )}
            </PictureSlot>

            <PictureSlot
              label={d.page.bannerPic}
              hint={d.page.bannerPicHint}
              url={bannerUrl}
              accept={MEDIA_TYPES}
              busy={busy === "banner"}
              error={upErr.banner}
              onFile={(f) => void upload("banner", f)}
              onRemove={() => setPic("bannerPath", null)}
              frameClass="h-24 w-full"
              place={cfg.bannerImage}
              onPlace={(v) => setPart("bannerImage", v)}
            >
              <Choice label={d.page.banner} value={cfg.header.banner} options={d.page.banners} onChange={(banner) => setPart("header", { banner })} />
              {cfg.header.banner === "custom" && (
                <Slider
                  label={d.page.bannerHeight}
                  value={cfg.header.bannerHeight}
                  min={80}
                  max={480}
                  step={10}
                  show={`${cfg.header.bannerHeight}px`}
                  onChange={(bannerHeight) => setPart("header", { bannerHeight })}
                />
              )}
              {bannerUrl && cfg.header.banner !== "none" && (
                <Slider
                  label={d.page.bgDim}
                  value={cfg.bannerImage.dim}
                  min={0}
                  max={80}
                  step={5}
                  show={`${cfg.bannerImage.dim}%`}
                  onChange={(dim) => setPart("bannerImage", { dim })}
                />
              )}
              {cfg.header.banner !== "none" && cfg.header.avatar !== "hidden" && (
                <Check
                  label={d.page.overlap}
                  checked={cfg.header.overlap}
                  onChange={(e) => setPart("header", { overlap: e.target.checked })}
                />
              )}
            </PictureSlot>

            <PictureSlot
              label={d.page.bgPic}
              hint={d.page.bgPicHint}
              url={bgUrl}
              accept={IMAGE_TYPES}
              busy={busy === "background"}
              error={upErr.background}
              onFile={(f) => void upload("background", f)}
              onRemove={() => {
                touch();
                setCfg((c) => ({ ...c, backgroundImagePath: null, background: c.background === "image" ? "dots" : c.background }));
              }}
              frameClass="aspect-video w-full"
              place={{ x: cfg.bgImage.x, y: cfg.bgImage.y, zoom: 1 }}
              onPlace={({ x, y }) => setPart("bgImage", { ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) })}
              noZoom
            >
              {bgUrl && cfg.background !== "image" && (
                <Button type="button" size="sm" onClick={() => set("background", "image")}>
                  {d.page.bgUse}
                </Button>
              )}
              {bgUrl && cfg.background === "image" && (
                <>
                  <Choice label={d.page.bgSize} value={cfg.bgImage.size} options={d.page.bgSizes} onChange={(size) => setPart("bgImage", { size })} />
                  <Slider
                    label={d.page.bgDim}
                    value={cfg.bgImage.dim}
                    min={0}
                    max={80}
                    step={5}
                    show={`${cfg.bgImage.dim}%`}
                    onChange={(dim) => setPart("bgImage", { dim })}
                  />
                  <Check label={d.page.bgFixed} checked={cfg.bgImage.fixed} onChange={(e) => setPart("bgImage", { fixed: e.target.checked })} />
                </>
              )}
            </PictureSlot>

            <Choice label={d.page.headerAlign} value={cfg.header.align} options={d.page.aligns} onChange={(align) => setPart("header", { align })} />
          </div>
        </Panel>

        <Panel title={d.page.layoutTitle}>
          <p className="mb-3 text-sm text-ink-soft">{d.page.layoutHint}</p>
          <ArrangeButton d={d} arrange={arrange} onClick={toggleArrange} className="mb-3 w-full justify-center" />
          <ul className="mb-3 grid gap-1">
            {flatBoxes(cfg.grid).map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 bg-paper-2 px-2 py-1">
                <span className={`flex-1 font-display ${b.hidden ? "text-ink-faint line-through" : ""}`}>
                  {boxName(d, b.id, cfg.texts)}
                  {b.id === "shop" && noProducts && (
                    <span className="ml-2 font-sans text-xs text-ink-soft no-underline">
                      {d.page.shopHidden}{" "}
                      <Link href="/dashboard/products" className="underline">
                        {d.page.shopAdd}
                      </Link>
                    </span>
                  )}
                </span>
                {b.minH > 0 && (
                  <button type="button" className="text-xs underline" onClick={() => updateGrid((g) => updateBox(g, b.id, { minH: 0 }))}>
                    {d.page.autoHeight}
                  </button>
                )}
                {b.id !== "tip" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-pressed={b.hidden}
                    onClick={() => updateGrid((g) => updateBox(g, b.id, { hidden: !b.hidden }))}
                  >
                    {b.hidden ? d.page.boxShow : d.page.boxHide}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="px-label">{d.page.presets}</div>
          <div className="mb-3 flex flex-wrap gap-1">
            {(["left", "right", "single"] as const).map((k) => (
              <button key={k} type="button" className="px-btn px-btn-sm" onClick={() => updateGrid((g) => presetGrid(k, g))}>
                {d.page.presetNames[k]}
              </button>
            ))}
          </div>
          <Field label={d.page.focus}>
            <Select value={cfg.focus} onChange={(e) => set("focus", e.target.value as PageConfig["focus"])}>
              <option value="tip">{d.page.focusTip}</option>
              <option value="shop">{d.page.focusLayout}</option>
            </Select>
          </Field>
        </Panel>

        <TextsPanel
          d={d}
          texts={cfg.texts}
          onAdd={addText}
          onChange={changeText}
          onRemove={removeText}
          onPicture={(id, f) => void uploadTextPicture(id, f)}
          busy={textBusy}
          errors={textErr}
        />

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
                  <span
                    className="flex-1"
                    style={{ background: THEMES[t].paper }}
                  />
                  <span className="w-3" style={{ background: THEMES[t].ink }} />
                </span>
                <span className="mt-1 block font-display">
                  {d.page.themeNames[t]}
                </span>
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
          {cfg.background === "image" && !cfg.backgroundImagePath && (
            <p className="text-sm text-ink-soft">{d.page.bgNeedsPicture}</p>
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => set("frameColor", null)}
                >
                  {d.page.frameDefault}
                </Button>
              )}
            </div>
          </Field>
          {pets.length > 0 && (
            <Field label={d.page.pet}>
              <Select
                value={cfg.petId ?? ""}
                onChange={(e) => set("petId", e.target.value || null)}
              >
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

        <Panel title={d.page.colorsTitle}>
          <p className="mb-3 text-sm text-ink-soft">{d.page.colorsHint}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(["paper", "card", "text", "muted", "field"] as const).map((k) => {
              const theme = THEMES[cfg.theme];
              const fallback = {
                paper: theme.paper,
                card: theme.paper2,
                text: theme.ink,
                muted: theme.inkSoft,
                field: theme.field,
              }[k];
              return (
                <div key={k} className="grid gap-1">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="color"
                      value={cfg.colors[k] ?? fallback}
                      onChange={(e) =>
                        setPart("colors", { [k]: e.target.value })
                      }
                      className="h-8 w-10 cursor-pointer border-[3px] border-ink bg-paper"
                    />
                    {d.page.colorNames[k]}
                  </label>
                  {cfg.colors[k] && (
                    <button
                      type="button"
                      className="justify-self-start text-xs underline"
                      onClick={() => setPart("colors", { [k]: null })}
                    >
                      {d.page.colorReset}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title={d.page.shapeTitle}>
          <Choice
            label={d.page.shape}
            value={cfg.shape}
            options={d.page.shapes}
            onChange={(shape) => set("shape", shape)}
          />
          {cfg.shape === "rounded" && (
            <Slider
              label={d.page.radius}
              value={cfg.radius}
              min={0}
              max={32}
              step={1}
              show={`${cfg.radius}px`}
              onChange={(radius) => set("radius", radius)}
            />
          )}
          <Choice
            label={d.page.width}
            value={cfg.width}
            options={d.page.widths}
            onChange={(width) => set("width", width)}
          />
          <Slider
            label={d.page.textScale}
            value={cfg.textScale}
            min={0.9}
            max={1.25}
            step={0.05}
            show={`${Math.round(cfg.textScale * 100)}%`}
            onChange={(textScale) => set("textScale", textScale)}
          />
        </Panel>

        <Panel title={d.page.fonts}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label={d.page.fontHeading} htmlFor="font-heading">
              <FontPicker
                id="font-heading"
                value={cfg.fonts.heading}
                onChange={(heading) => setFonts({ heading })}
                builtins={["default"]}
                brand={Boolean(cfg.brandFontPath)}
              />
            </Field>
            <Field label={d.page.fontBody} htmlFor="font-body">
              <FontPicker
                id="font-body"
                value={cfg.fonts.body}
                onChange={(body) => setFonts({ body })}
                builtins={["default"]}
                brand={Boolean(cfg.brandFontPath)}
              />
            </Field>
          </div>
          <Field
            label={d.fonts.brandTitle}
            hint={d.fonts.brandHint}
            error={fontError}
          >
            <div className="flex flex-wrap items-center gap-2">
              <label className="px-btn px-btn-sm cursor-pointer">
                {fontBusy ? "…" : d.fonts.brandUpload}
                <input
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFont(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {cfg.brandFontPath && (
                <>
                  <span className="truncate text-sm text-ink-soft">
                    {cfg.brandFontPath
                      .split("/")
                      .pop()
                      ?.replace(/^[a-z0-9]+-/, "")}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      set("brandFontPath", null);
                      setCfg((c) => ({
                        ...c,
                        fonts: {
                          heading:
                            c.fonts.heading === "brand"
                              ? "default"
                              : c.fonts.heading,
                          body:
                            c.fonts.body === "brand" ? "default" : c.fonts.body,
                        },
                      }));
                    }}
                  >
                    {d.fonts.brandRemove}
                  </Button>
                </>
              )}
            </div>
          </Field>
        </Panel>

        <Panel title={d.page.texts}>
          <Field label={d.page.tipTitle}>
            <Input
              value={cfg.tipTitle}
              maxLength={60}
              placeholder={d.store.tipTitle}
              onChange={(e) => set("tipTitle", e.target.value)}
            />
          </Field>
          <Field label={d.page.tipNote}>
            <Textarea
              value={cfg.tipNote}
              maxLength={300}
              rows={2}
              onChange={(e) => set("tipNote", e.target.value)}
            />
          </Field>
          <Field label={d.page.buttonLabel}>
            <Input
              value={cfg.buttonLabel}
              maxLength={30}
              placeholder={d.store.send}
              onChange={(e) => set("buttonLabel", e.target.value)}
            />
          </Field>
          <Field label={d.page.thanks}>
            <Textarea
              value={cfg.thanksMessage}
              maxLength={300}
              rows={2}
              placeholder={d.pay.statusVerifiedTip}
              onChange={(e) => set("thanksMessage", e.target.value)}
            />
          </Field>
        </Panel>

        <div id="wall" className="scroll-mt-4" />
        <Panel title={d.page.wall}>
          <Check
            checked={cfg.wall.showAmounts}
            onChange={(e) => setPart("wall", { showAmounts: e.target.checked })}
            label={d.page.showAmounts}
          />
          <div className="grid grid-cols-3 gap-3">
            <Field label={d.page.recentCount}>
              <Input
                type="number"
                min={0}
                max={20}
                value={cfg.wall.recentCount}
                onChange={(e) =>
                  setPart("wall", { recentCount: clamp(e.target.value, 0, 20) })
                }
              />
            </Field>
            <Field label={d.page.topCount}>
              <Input
                type="number"
                min={0}
                max={10}
                value={cfg.wall.topCount}
                onChange={(e) =>
                  setPart("wall", { topCount: clamp(e.target.value, 0, 10) })
                }
              />
            </Field>
            <Field label={d.page.topPeriod}>
              <Select
                value={cfg.wall.topPeriod}
                onChange={(e) =>
                  setPart("wall", {
                    topPeriod: e.target.value as "30d" | "all",
                  })
                }
              >
                <option value="30d">{d.page.period30d}</option>
                <option value="all">{d.page.periodAll}</option>
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title={d.page.unit}>
          <p className="mb-2 text-sm text-ink-soft">{d.page.unitHint}</p>
          <Check
            checked={cfg.unit.enabled}
            onChange={(e) => setPart("unit", { enabled: e.target.checked })}
            label={d.page.unitEnabled}
          />
          {cfg.unit.enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={d.page.unitName}>
                  <Input
                    value={cfg.unit.name}
                    maxLength={20}
                    onChange={(e) =>
                      setPart("unit", { name: e.target.value || cfg.unit.name })
                    }
                  />
                </Field>
                <Field label={d.page.unitPrice}>
                  <Input
                    type="number"
                    min={1}
                    value={cfg.unit.price}
                    onChange={(e) =>
                      setPart("unit", {
                        price: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </Field>
              </div>
              <Field label={d.page.unitIcon}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {cfg.unit.iconPath && <UnitIcon icon={cfg.unit.icon} url={publicMediaUrl(cfg.unit.iconPath)} size={40} />}
                  <label className="px-btn px-btn-sm cursor-pointer">
                    {unitBusy ? d.common.uploading : cfg.unit.iconPath ? d.page.unitIconChange : d.page.unitIconUpload}
                    <input
                      type="file"
                      accept="image/gif,image/webp,image/png,image/jpeg,video/webm"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setUnitErr(null);
                        if (f.size > MAX_GIF_BYTES) return setUnitErr(d.common.errTooBig);
                        setUnitBusy(true);
                        try {
                          setPart("unit", { iconPath: await uploadPublicMedia(supabase, userId, f, "units") });
                        } catch (err) {
                          setUnitErr(errorText((err as Error).message, d));
                        } finally {
                          setUnitBusy(false);
                        }
                      }}
                    />
                  </label>
                  {cfg.unit.iconPath && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPart("unit", { iconPath: null })}>
                      {d.page.unitIconBuiltin}
                    </Button>
                  )}
                </div>
                {unitErr && <p className="mb-2 text-sm text-tomato">{unitErr}</p>}
                <div className={`flex gap-2 ${cfg.unit.iconPath ? "opacity-50" : ""}`}>
                  {ICON_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPart("unit", { icon: id, iconPath: null })}
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
                    const list = [
                      ...new Set(
                        e.target.value
                          .split(/[,\s]+/)
                          .map(Number)
                          .filter(
                            (n) => Number.isInteger(n) && n > 0 && n < 1000,
                          ),
                      ),
                    ].slice(0, 5);
                    if (list.length) setPart("unit", { presets: list });
                  }}
                />
              </Field>
            </>
          )}
        </Panel>

        <Panel title={d.page.cssTitle}>
          <details>
            <summary className="cursor-pointer font-display">
              {d.page.cssOpen}
            </summary>
            <p className="my-2 text-sm text-ink-soft">{d.page.cssHint}</p>
            <Textarea
              rows={8}
              maxLength={MAX_PAGE_CSS}
              className="font-mono text-sm"
              value={cfg.css.replace(/\\3c /g, "<")}
              onChange={(e) => set("css", e.target.value)}
              spellCheck={false}
              aria-label={d.page.cssTitle}
            />
          </details>
        </Panel>

        <div
          className={`sticky z-10 -mx-2 flex flex-wrap items-center gap-3 border-t-[3px] border-dashed border-ink/20 bg-paper px-2 py-2 ${
            full ? "bottom-0" : "bottom-[68px] md:bottom-0"
          }`}
        >
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!info.displayName.trim()) return setSaveErr("name");
                const r = await savePageConfig(cfg, pics, { ...info, minTip: info.minTip || 1 }).catch(() => null);
                setSaved(Boolean(r?.ok));
                setSaveErr(r?.ok ? null : (r?.error ?? "network"));
                if (r?.ok) setDirty(false);
              })
            }
          >
            {pending ? d.common.loading : d.common.save}
          </Button>
          {saveErr ? (
            <span className="text-sm text-tomato">{saveErr === "name" ? d.page.nameNeeded : d.common.error}</span>
          ) : saved ? (
            <span className="font-display text-leaf">✓ {d.common.saved}</span>
          ) : (
            dirty && <span className="text-sm text-ink-soft">{d.page.unsaved}</span>
          )}
          {/* Below xl the preview sits under everything; this opens it right away. */}
          <Button type="button" size="sm" variant="ghost" className="ml-auto xl:hidden" onClick={() => setFull(true)}>
            {d.page.previewFull}
          </Button>
        </div>
      </div>

      <div className={full ? "min-h-0 min-w-0" : "min-w-0 xl:sticky xl:top-4"}>
        <DevicePreview
          full={full}
          onFull={setFull}
          device={device}
          onDevice={setDevice}
          onDoubleClick={arrangeAt}
          hint={arrange ? undefined : d.page.arrangeDblClick}
          extra={
            <>
              <ArrangeButton d={d} arrange={arrange} onClick={toggleArrange} />
              {!arrange && cfg.texts.length < MAX_TEXTS && (
                <button type="button" onClick={addText} className="px-btn px-btn-sm">
                  + {d.page.textAdd}
                </button>
              )}
              <span className="self-center text-sm text-ink-soft">
                {arrange ? (device !== "desktop" ? d.page.narrowHint : d.page.arrangeHint) : d.page.previewHint}
              </span>
              {pictureError && !arrange && <span className="self-center text-sm text-tomato">{pictureError}</span>}
              {noProducts && (
                <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={demoShop} onChange={(e) => setDemoShop(e.target.checked)} />
                  {d.page.shopDemo}
                </label>
              )}
            </>
          }
        >
          <StoreView store={previewStore} d={d} locale={locale} preview edit={arrange ? edit : undefined} picture={arrange ? undefined : pictureButton}
            inline={arrange ? undefined : inlineText}
          />
        </DevicePreview>
        {overlay}
      </div>
    </div>
  );
}

type Pictures = { avatarPath: string | null; bannerPath: string | null };
type Slot = "avatar" | "banner" | "background";
const IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";
const MEDIA_TYPES = `${IMAGE_TYPES},video/webm,video/mp4`;
/** The public-media bucket's own limit. */
const MAX_PICTURE_BYTES = 10 * 1024 * 1024;

type Place = { x: number; y: number; zoom: number };

/**
 * One picture: a frame you can drag the picture around in, upload / change / remove, then
 * the fine controls (zoom, exact position) and whatever options belong to that picture.
 */
function PictureSlot({
  label,
  hint,
  url,
  accept,
  busy,
  error,
  onFile,
  onRemove,
  frameClass,
  place,
  onPlace,
  noZoom,
  children,
}: {
  label: string;
  hint: string;
  url: string | null;
  accept: string;
  busy: boolean;
  error?: string;
  onFile: (f: File) => void;
  onRemove: () => void;
  frameClass: string;
  place: Place;
  onPlace: (p: Partial<Place>) => void;
  noZoom?: boolean;
  children?: React.ReactNode;
}) {
  const { d } = useT();
  return (
    <div className="grid gap-2 border-b-2 border-dashed border-ink/15 pb-4">
      <div className="font-display text-lg">{label}</div>
      <div className="flex flex-wrap items-start gap-3">
        <DragFrame url={url} place={place} onPlace={onPlace} className={`px-checker shrink-0 border-[3px] border-ink ${frameClass}`} />
        <div className="grid min-w-40 flex-1 gap-2">
          <p className="text-sm text-ink-soft">{hint}</p>
          <div className="flex flex-wrap gap-2">
            <label className="px-btn px-btn-sm cursor-pointer">
              {busy ? d.common.uploading : url ? d.page.pictureChange : d.page.pictureUpload}
              <input
                type="file"
                accept={accept}
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onFile(f);
                }}
              />
            </label>
            {url && (
              <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
                {d.page.pictureRemove}
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-tomato">{error}</p>}
      {url && (
        <div className={`grid gap-x-4 ${noZoom ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {!noZoom && (
            <Slider
              label={d.page.zoom}
              value={place.zoom}
              min={1}
              max={3}
              step={0.05}
              show={`${Math.round(place.zoom * 100)}%`}
              onChange={(zoom) => onPlace({ zoom })}
            />
          )}
          <Slider label={d.design.look.imageX} value={place.x} min={0} max={100} step={1} show={`${Math.round(place.x)}%`} onChange={(x) => onPlace({ x })} />
          <Slider label={d.design.look.imageY} value={place.y} min={0} max={100} step={1} show={`${Math.round(place.y)}%`} onChange={(y) => onPlace({ y })} />
        </div>
      )}
      {children}
    </div>
  );
}

/** Drag inside the frame to move the picture; updates at most once per frame. */
function DragFrame({
  url,
  place,
  onPlace,
  className,
}: {
  url: string | null;
  place: Place;
  onPlace: (p: Partial<Place>) => void;
  className: string;
}) {
  const { d } = useT();
  const drag = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);
  const raf = useRef(0);
  const style: React.CSSProperties = {
    objectPosition: `${place.x}% ${place.y}%`,
    ...(place.zoom !== 1 ? { transform: `scale(${place.zoom})`, transformOrigin: `${place.x}% ${place.y}%` } : {}),
  };
  const clamp100 = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
  const stop = () => {
    drag.current = null;
  };
  return (
    <div
      className={`relative overflow-hidden ${url ? "cursor-grab touch-none select-none active:cursor-grabbing" : ""} ${className}`}
      title={url ? d.page.dragHint : undefined}
      onPointerDown={(e) => {
        if (!url) return;
        const r = e.currentTarget.getBoundingClientRect();
        drag.current = { px: e.clientX, py: e.clientY, x: place.x, y: place.y, w: r.width, h: r.height };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const g = drag.current;
        if (!g) return;
        // Dragging the picture right shows more of its left side, so the percent goes down.
        // Zoomed in, the same drag covers less of the picture.
        const k = 100 / place.zoom;
        const x = clamp100(g.x - ((e.clientX - g.px) / g.w) * k);
        const y = clamp100(g.y - ((e.clientY - g.py) / g.h) * k);
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => onPlace({ x, y }));
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      {url &&
        (mediaKindOf(url) === "video" ? (
          <video src={url} className="pointer-events-none absolute inset-0 size-full object-cover" style={style} autoPlay muted loop playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- storage CDN
          <img src={url} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full object-cover" style={style} />
        ))}
    </div>
  );
}

function clamp(v: string, min: number, max: number) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

const DEVICES = { phone: 390, tablet: 820, desktop: 1280 } as const;
/** A phone is small next to a wide preview area; let it grow a bit so text is easy to read. */
const MAX_SCALE = { phone: 1.3, tablet: 1, desktop: 1 } as const;

/**
 * The page as viewers see it at a real device width, scaled to fit. The page lays itself
 * out by its own width (container queries), so every size is exact.
 */
type Device = keyof typeof DEVICES;

/**
 * Text typed straight onto the preview. The browser owns the text while you type (React
 * only writes it when it changed from elsewhere), so the cursor never jumps.
 */
function InlineText({
  value,
  placeholder,
  max,
  multiline = false,
  onChange,
}: {
  value: string;
  placeholder: string;
  max: number;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== value) el.textContent = value;
  }, [value]);
  return (
    <span
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      aria-multiline={multiline}
      data-ph={placeholder}
      spellCheck={false}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (!multiline && e.key === "Enter")) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onInput={(e) => {
        const el = e.currentTarget;
        let v = el.innerText.replace(/\n$/, "");
        if (!multiline) v = v.replace(/\s*\n\s*/g, " ");
        if (v.length > max) {
          v = v.slice(0, max);
          el.textContent = v;
        }
        onChange(v);
      }}
      className={`${multiline ? "block min-h-[1.5em]" : "inline-block min-w-[3ch] max-w-full"} cursor-text whitespace-pre-wrap outline-2 outline-offset-4 outline-transparent outline-dashed hover:outline-[var(--accent)] focus:outline-[var(--accent)] empty:before:opacity-45 empty:before:content-[attr(data-ph)]`}
    />
  );
}

/** A pixel camera: "change this picture". */
function CameraIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden shapeRendering="crispEdges" className="shrink-0">
      <path d="M4 0h6v2h4v10H0V2h4zM2 4v6h10V4zm3 1h4v1h1v2H9v1H5V8H4V6h1z" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** The main way into arranging, so it stands out: yellow with a grid mark, green while on. */
function ArrangeButton({ d, arrange, onClick, className = "" }: { d: Dict; arrange: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={arrange}
      className={`px-btn flex items-center gap-2 font-display ${arrange ? "px-btn-primary" : "px-btn-beak"} ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden shapeRendering="crispEdges" className="shrink-0">
        {arrange ? (
          <path d="M1 7h3v3h2V9h2V7h2V5h2V3h2v3h-2v2h-2v2H8v2H6v1H4v-1H3v-2H1z" fill="currentColor" />
        ) : (
          <>
            <rect x="0" y="0" width="6" height="6" fill="currentColor" />
            <rect x="8" y="0" width="6" height="6" fill="currentColor" />
            <rect x="0" y="8" width="14" height="6" fill="currentColor" />
          </>
        )}
      </svg>
      {arrange ? d.page.arrangeDone : d.page.arrange}
    </button>
  );
}

function DevicePreview({
  children,
  full,
  onFull,
  device,
  onDevice,
  onDoubleClick,
  hint,
  extra,
}: {
  children: React.ReactNode;
  full: boolean;
  onFull: (v: boolean) => void;
  device: Device;
  onDevice: (d: Device) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Tooltip on the page itself. */
  hint?: string;
  /** Preview-only switches shown under the device buttons. */
  extra?: React.ReactNode;
}) {
  const { d } = useT();
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(400);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRoom(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const width = DEVICES[device];
  // Leave a little air around a phone so it reads as a device, not a column.
  const scale = Math.max(0.1, Math.min(MAX_SCALE[device], (room - (device === "phone" ? 24 : 0)) / width));
  return (
    <div className={full ? "flex h-full min-h-0 flex-col" : ""}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="px-label">
          {d.page.preview} <span className="font-num text-ink-faint">{Math.round(scale * 100)}%</span>
        </span>
        <div className="flex flex-wrap gap-1">
          <div className="flex gap-1" role="radiogroup" aria-label={d.page.preview}>
            {(Object.keys(DEVICES) as Array<keyof typeof DEVICES>).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={device === k}
                onClick={() => onDevice(k)}
                className={`px-btn px-btn-sm ${device === k ? "px-btn-primary" : "px-btn-ghost"}`}
              >
                {d.page.devices[k]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onFull(!full)} className={`px-btn px-btn-sm ${full ? "px-btn-primary" : ""}`}>
            {full ? d.page.exitFull : d.page.fullscreen}
          </button>
        </div>
      </div>
      {extra && <div className="mb-2 flex flex-wrap items-center gap-3">{extra}</div>}
      <div ref={box} className={`px-checker flex justify-center py-3 ${full ? "min-h-0 flex-1" : ""}`}>
        <div
          className={`px-frame overflow-x-hidden overflow-y-auto ${full ? "max-h-full" : "max-h-[calc(100dvh-7rem)]"}`}
          style={{ width: width * scale }}
        >
          {/* data-zoom: the arrange handles turn screen pixels back into page pixels with it. */}
          <div
            style={{ width, zoom: scale, ["--pz" as string]: scale }}
            data-zoom={scale}
            onDoubleClick={(e) => {
              // Not on the picture buttons: a quick double click there is someone picking a file.
              if ((e.target as HTMLElement).closest("label, button, input, a")) return;
              onDoubleClick?.(e);
            }}
            title={hint}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
