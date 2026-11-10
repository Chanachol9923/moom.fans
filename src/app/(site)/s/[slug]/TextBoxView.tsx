import type { TextBox } from "@/lib/page-config";

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
export function TextBoxView({ box }: { box: TextBox }) {
  const accent = box.look === "accent";
  return (
    <section
      className={`${LOOK[box.look]} ${ALIGN[box.align]} min-w-0`}
      style={accent ? { background: "var(--accent)", color: "#fffaf0" } : undefined}
    >
      {box.title.trim() && <h2 className={`mb-2 ${TITLE[box.size]}`}>{box.title}</h2>}
      {box.body.trim() && (
        <p className={`whitespace-pre-line break-words ${SIZE[box.size]} ${accent ? "" : "text-ink-soft"}`}>{withLinks(box.body)}</p>
      )}
    </section>
  );
}
