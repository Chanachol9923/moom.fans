import type { Dict } from "@moom/shared/i18n";

/**
 * How the streamer sees a supporter in their dashboard. A tip without a name is stored
 * as "-"; a named one marked anonymous keeps the name here (only the stream hides it).
 */
export function supporterLabel(t: { supporter_name: string; is_anonymous?: boolean | null }, d: Dict): string {
  const name = t.supporter_name.trim();
  if (!name || name === "-") return d.store.anonymous;
  return t.is_anonymous ? `${name} · ${d.store.hiddenOnStream}` : name;
}
