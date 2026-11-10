import { AnimatedSprite } from "@moom/shared/ui/AnimatedSprite";
import { GoalBar } from "@moom/shared/ui/GoalBar";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { siteUrl } from "@/lib/hosts";
import { formatBaht, type Dict, type Locale } from "@moom/shared/i18n";
import { backgroundStyle, safePageCss, themeVars } from "@/lib/page-config";
import { isTextBox, type BoxId, type GridBox } from "@/lib/page-grid";
import { TextBoxView } from "./TextBoxView";
import { brandFontCss, googleFontsHref } from "@moom/shared/fonts";
import { mediaKindOf } from "@moom/shared/overlay/design";
import { PRESETS } from "@moom/shared/pets/sprites";
import type { Store } from "./data";
import { ProductGrid } from "./ProductGrid";
import { TipBox } from "./TipBox";

/** Presentational storefront. Also rendered by the page designer preview and the dev gallery. */
const BANNER = { none: "hidden", short: "h-36 @min-[40rem]:h-48", tall: "h-56 @min-[40rem]:h-72", custom: "" } as const;
const AVATAR = {
  s: "size-16 @min-[40rem]:size-20",
  m: "size-24 @min-[40rem]:size-28",
  l: "size-28 @min-[40rem]:size-36",
  xl: "size-32 @min-[40rem]:size-44",
} as const;
const AVATAR_SHAPE = { square: "", rounded: "rounded-[22%]", round: "rounded-full", hidden: "" } as const;
const WIDTH = { narrow: "max-w-3xl", normal: "max-w-5xl", wide: "max-w-7xl" } as const;

/** Lets the page designer wrap each box with its move / resize / hide controls. */
export type StoreEdit = {
  box: (b: GridBox, node: React.ReactNode, at: { row: number; col: number; lastCol: boolean }) => React.ReactNode;
  /** Shown in place of a box that has nothing in it yet (no goal, no products...). */
  empty: (id: BoxId) => React.ReactNode;
};

/** Where the designer's "change picture" buttons go on the preview. */
export type PictureSpot = "avatar" | "banner" | "background" | `text-${string}`;
/** Text the designer lets you type straight onto the preview. */
export type InlineField = "name" | "bio" | `text-${string}.${"title" | "body"}`;

export function StoreView({
  store,
  d,
  locale,
  preview = false,
  edit,
  picture,
  inline,
}: {
  store: Store;
  d: Dict;
  locale: Locale;
  preview?: boolean;
  edit?: StoreEdit;
  /** Designer only: a button to change the picture at that spot. */
  picture?: (spot: PictureSpot) => React.ReactNode;
  /** Designer only: an editable stand-in for that text. */
  inline?: (field: InlineField, value: string) => React.ReactNode;
}) {
  const cfg = store.page;

  // null = nothing to show yet. The shop stays hidden until there is a product.
  const content = (id: BoxId): React.ReactNode => {
    if (isTextBox(id)) {
      const t = cfg.texts.find((x) => x.id === id);
      if (!t || !(inline || t.title.trim() || t.body.trim() || t.image)) return null;
      const typed = inline && ((part: "title" | "body", v: string) => inline(`${t.id}.${part}` as InlineField, v));
      return picture ? (
        <div className="relative grid">
          <TextBoxView box={t} inline={typed || undefined} />
          <div className="absolute top-2 right-2 z-10">{picture(t.id as PictureSpot)}</div>
        </div>
      ) : (
        <TextBoxView box={t} />
      );
    }
    switch (id) {
      case "tip":
        return <TipBox store={store} preview={preview} />;
      case "goal":
        return store.goal ? (
          <section className="px-frame bg-paper p-4">
            <h2 className="mb-2 text-sm text-ink-soft">{d.store.goal}</h2>
            <GoalBar {...store.goal} accent={store.accent} d={d} locale={locale} />
          </section>
        ) : null;
      case "about":
        return store.bio || inline ? (
          <section className="px-frame bg-paper p-4">
            <h2 className="mb-2 text-xl">{d.store.about}</h2>
            <p className="whitespace-pre-line text-ink-soft">{inline ? inline("bio", store.bio) : store.bio}</p>
          </section>
        ) : null;
      case "shop":
        return store.products.length ? (
          <section id="shop">
            <h2 className="mb-4 text-2xl">{d.store.shopTitle}</h2>
            <ProductGrid store={store} preview={preview} />
          </section>
        ) : null;
      case "supporters":
        return (
          <section className="px-frame bg-paper p-4">
            <h2 className="mb-3 text-xl">{d.store.supportersTitle}</h2>
            <SupportersWall store={store} d={d} locale={locale} />
          </section>
        );
    }
  };

  // The designer shows every box (hidden ones dimmed); viewers only see the ones with something in them.
  const rows = cfg.grid.rows
    .map((r, ri) => ({
      ri,
      cols: r.cols
        .map((c, ci) => ({
          ci,
          w: c.w,
          lastCol: ci === r.cols.length - 1,
          items: c.boxes
            .map((b) => ({ b, node: edit ? (content(b.id) ?? edit.empty(b.id)) : b.hidden ? null : content(b.id) }))
            .filter((x) => x.node),
        }))
        .filter((c) => c.items.length > 0),
    }))
    .filter((r) => r.cols.length > 0);

  const fontsHref = googleFontsHref([cfg.fonts.heading, cfg.fonts.body]);
  const brandCss = brandFontCss(store.brandFontUrl);

  return (
    <div
      style={{ ...themeVars(cfg, store.accent), ...backgroundStyle(cfg, store.backgroundUrl) }}
      // A container, so the layout follows the page's own width: the same in the browser,
      // and right in the dashboard's phone/desktop preview whatever the window size.
      className={`moom-page @container ${preview ? "" : "min-h-dvh"} relative pb-16`}
      data-shape={cfg.shape}
      data-layout={cfg.layout}
    >
      {/* No `precedence`: React would suspend the page until the font loads, and the
          nearest loading screen flashes as if the page reloaded. Text swaps in instead. */}
      {fontsHref && <link key={fontsHref} rel="stylesheet" href={fontsHref} />}
      {brandCss && <style>{brandCss}</style>}
      {/* Cleaned by safePageCss; @scope keeps it on the page even inside the dashboard preview. */}
      {cfg.css && <style>{`@scope (.moom-page) {\n${safePageCss(cfg.css)}\n}`}</style>}
      <div
        className={`moom-page__banner relative w-full overflow-hidden ${BANNER[cfg.header.banner]}`}
        style={{
          ...(cfg.header.banner === "custom" ? { height: cfg.header.bannerHeight } : {}),
          ...(store.bannerUrl
            ? {}
            : {
                backgroundColor: store.accent,
                backgroundImage:
                  "linear-gradient(45deg, rgba(0,0,0,.08) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.08) 75%), linear-gradient(45deg, rgba(0,0,0,.08) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.08) 75%)",
                backgroundSize: "24px 24px",
                backgroundPosition: "0 0, 12px 12px",
              }),
        }}
      >
        {store.bannerUrl && cfg.header.banner !== "none" && <PlacedMedia url={store.bannerUrl} place={cfg.bannerImage} />}
        {store.bannerUrl && cfg.bannerImage.dim > 0 && (
          <div className="absolute inset-0 bg-black" style={{ opacity: cfg.bannerImage.dim / 100 }} />
        )}
        {picture && cfg.header.banner !== "none" && <div className="absolute top-3 right-3 z-10">{picture("banner")}</div>}
      </div>
      {picture && <div className={`absolute left-3 z-10 ${cfg.header.banner === "none" ? "top-1" : "top-3"}`}>{picture("background")}</div>}
      <div className={`mx-auto w-full px-4 ${WIDTH[cfg.width]}`}>
        <header
          className={`moom-page__header relative flex flex-wrap gap-4 ${
            cfg.header.banner === "none" ? "pt-8" : cfg.header.overlap && cfg.header.avatar !== "hidden" ? "-mt-12" : "pt-5"
          } ${
            cfg.header.align === "center" ? "flex-col items-center text-center" : "items-end"
          }`}
        >
          <div className={cfg.header.avatar === "hidden" ? "hidden" : "relative"}>
            <div
              className={`moom-page__avatar relative shrink-0 overflow-hidden bg-paper ${AVATAR[cfg.header.avatarSize]} ${
                AVATAR_SHAPE[cfg.header.avatar]
              } ${!cfg.header.avatarBorder ? "" : cfg.header.avatar === "square" ? "px-frame" : "border-[3px] border-ink"}`}
            >
              {store.avatarUrl ? (
                <PlacedMedia url={store.avatarUrl} place={cfg.avatarImage} />
              ) : (
                <div className="grid size-full place-items-center bg-paper-2">
                  <PixelSprite sprite={PRESETS.bird} size={72} />
                </div>
              )}
            </div>
            {picture && <div className="absolute -right-2 -bottom-2 z-10">{picture("avatar")}</div>}
            {store.pet && (
              <div className="absolute -right-10 bottom-0">
                <AnimatedSprite sprite={store.pet} size={48} />
              </div>
            )}
          </div>
          <div className={`min-w-0 flex-1 pb-1 ${store.pet && cfg.header.align === "left" ? "@min-[40rem]:pl-8" : ""}`}>
            <h1 className="text-3xl leading-tight break-words @min-[40rem]:text-4xl">{inline ? inline("name", store.displayName) : store.displayName}</h1>
            {store.links.length > 0 && (
              <ul className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm ${cfg.header.align === "center" ? "justify-center" : ""}`}>
                {store.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline decoration-dotted">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="pb-2">
            <LocaleSwitch />
          </div>
        </header>

        {/* Wide: rows of columns. Narrow: rows and columns melt away (display: contents) and
            the boxes stack in reading order, with the tip box first unless asked otherwise. */}
        <div className="mt-8 grid gap-6">
          {rows.map((r) => {
            const total = r.cols.reduce((n, c) => n + c.w, 0);
            return (
              <div
                key={r.ri}
                data-row={r.ri}
                className="moom-page__row contents @min-[64rem]:mx-auto @min-[64rem]:grid @min-[64rem]:w-full @min-[64rem]:items-start @min-[64rem]:gap-6"
                style={{
                  gridTemplateColumns: r.cols.map((c) => `minmax(0, ${c.w}fr)`).join(" "),
                  maxWidth: total < 12 ? `${(total / 12) * 100}%` : undefined,
                }}
              >
                {r.cols.map((c) => {
                  const loneTip = c.items.length === 1 && c.items[0].b.id === "tip" && r.cols.length > 1;
                  return (
                    <div
                      key={c.ci}
                      className={`moom-page__col contents @min-[64rem]:grid @min-[64rem]:content-start @min-[64rem]:gap-6 ${
                        loneTip ? "@min-[64rem]:sticky @min-[64rem]:top-4" : ""
                      }`}
                    >
                      {c.items.map(({ b, node }) => (
                        <div
                          key={b.id}
                          data-box={b.id}
                          className={`moom-page__box relative grid ${b.id === "tip" ? "moom-page__tip" : ""} ${
                            b.id === "tip" && cfg.focus === "tip" ? "@max-[64rem]:-order-1" : ""
                          }`}
                          style={b.minH ? { minHeight: b.minH } : undefined}
                        >
                          {edit ? edit.box(b, node, { row: r.ri, col: c.ci, lastCol: c.lastCol }) : node}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <footer className="mt-16 text-center text-sm text-ink-faint">
          <a href={siteUrl("/")} className="inline-flex items-center gap-1.5 hover:text-ink">
            <PixelSprite sprite={PRESETS.bird} size={18} /> moom.fans
          </a>
        </footer>
      </div>
    </div>
  );
}

function SupportersWall({ store, d, locale }: { store: Store; d: Dict; locale: Locale }) {
  const show = store.page.wall.showAmounts;
  if (!store.recent.length && !store.top.length) return <p className="text-ink-soft">{d.store.noSupporters}</p>;
  return (
    <div className="grid gap-5 @min-[40rem]:grid-cols-2">
      {store.top.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm text-ink-soft">{store.page.wall.topPeriod === "30d" ? d.store.top30 : d.store.topAll}</h3>
          <ol className="grid gap-1">
            {store.top.map((t, i) => (
              <li key={t.name} className="flex items-center gap-2">
                <span
                  className="grid size-6 shrink-0 place-items-center font-num text-xs"
                  style={{ background: i === 0 ? "var(--beak)" : "var(--paper-2)" }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                {show && <span className="font-num text-sm text-ink-soft">{formatBaht(t.total, locale)}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {store.recent.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm text-ink-soft">{d.store.recent}</h3>
          <ul className="grid gap-1">
            {store.recent.map((r, i) => (
              <li key={`${r.at}-${i}`} className="flex items-center gap-2">
                <span className="size-2 shrink-0" style={{ background: store.accent }} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                {show && <span className="font-num text-sm text-ink-soft">{formatBaht(r.amount, locale)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * A cover or profile picture filling its box: positioned by percent and zoomed in around
 * that point. GIFs play as images; WebM/MP4 play muted on a loop.
 */
function PlacedMedia({ url, place }: { url: string; place: { x: number; y: number; zoom: number } }) {
  const style: React.CSSProperties = {
    objectPosition: `${place.x}% ${place.y}%`,
    ...(place.zoom !== 1 ? { transform: `scale(${place.zoom})`, transformOrigin: `${place.x}% ${place.y}%` } : {}),
  };
  return mediaKindOf(url) === "video" ? (
    <video src={url} className="absolute inset-0 size-full object-cover" style={style} autoPlay muted loop playsInline />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- user upload on storage CDN
    <img src={url} alt="" className="absolute inset-0 size-full object-cover" style={style} />
  );
}
