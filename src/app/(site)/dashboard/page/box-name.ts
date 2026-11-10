import { fmt, type Dict } from "@moom/shared/i18n";
import type { TextBox } from "@/lib/page-config";
import { isTextBox, type BoxId } from "@/lib/page-grid";

/** What a box is called in the designer: its own title for text boxes, else "Text box 2". */
export function boxName(d: Dict, id: BoxId, texts: TextBox[]): string {
  if (!isTextBox(id)) return d.page.boxNames[id];
  const i = texts.findIndex((t) => t.id === id);
  const title = texts[i]?.title.trim();
  return title ? (title.length > 24 ? `${title.slice(0, 23)}…` : title) : fmt(d.page.textBoxN, { n: i + 1 });
}
