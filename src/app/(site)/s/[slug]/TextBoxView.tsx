import type { TextBox } from "@/lib/page-config";
import { publicMediaUrl } from "@/lib/storage";

const SIZE = { s: "text-sm", m: "text-base", l: "text-lg", xl: "text-2xl" } as const;
const TITLE = { s: "text-base", m: "text-xl", l: "text-2xl", xl: "text-3xl" } as const;
const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;
const LOOK = {
  card: "px-frame bg-paper p-4",
  note: "px-frame bg-paper-2 p-4",
  accent: "px-frame p-4",
  plain: "px-1 py-2",
} as const;

const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

/** Plain text with web addresses turned into links. React escapes everything else. */
function withLinks(text: string) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener nofollow ugc" className="break-all underline">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

/** One of the streamer's own text boxes on the tip page. */
export function TextBoxView({
  box,
  inline,
}: {
  box: TextBox;
  /** Designer only: the title and text typed right on the preview. */
  inline?: (part: "title" | "body", value: string) => React.ReactNode;
}) {
  const accent = box.look === "accent";
  const url = publicMediaUrl(box.image);
  const hasText = Boolean(inline || box.title.trim() || box.body.trim());
  const text = hasText && (
    <div className="min-w-0">
      {(inline || box.title.trim()) && <h2 className={`mb-2 ${TITLE[box.size]}`}>{inline ? inline("title", box.title) : box.title}</h2>}
      {(inline || box.body.trim()) && (
        <p className={`whitespace-pre-line break-words ${SIZE[box.size]} ${accent ? "" : "text-ink-soft"}`}>
          {inline ? inline("body", box.body) : withLinks(box.body)}
        </p>
      )}
    </div>
  );
  // eslint-disable-next-line @next/next/no-img-element -- streamer's own picture or GIF from storage
  const picture = url && <img src={url} alt={box.title} loading="lazy" className="block h-auto w-full" />;
  // Beside the text on a wide box; above it when the page is narrow.
  const side = box.imagePlace === "left" || box.imagePlace === "right";
  return (
    <section
      className={`${LOOK[box.look]} ${ALIGN[box.align]} min-w-0 @container/text`}
      style={accent ? { background: "var(--accent)", color: "#fffaf0" } : undefined}
    >
      {picture && hasText && side ? (
        <div className="grid gap-3 @min-[28rem]/text:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @min-[28rem]/text:items-start">
          <div className={box.imagePlace === "right" ? "@min-[28rem]/text:order-2" : ""}>{picture}</div>
          <div className={box.imagePlace === "right" ? "@min-[28rem]/text:order-1" : ""}>{text}</div>
        </div>
      ) : (
        <div className="grid gap-3">
          {box.imagePlace !== "bottom" && picture}
          {text}
          {box.imagePlace === "bottom" && picture}
        </div>
      )}
    </section>
  );
}
