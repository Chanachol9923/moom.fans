import type { AlertKind, AlertPayload } from "./alerts";
import { fmt, formatBaht, getDict } from "./i18n";

/**
 * The sentence spoken for an alert. Names and messages were already filtered when queued.
 * Shared so the website's cloud voice and the desktop app's own voice say the same thing.
 */
export function alertSpeech(kind: AlertKind, p: AlertPayload, maxChars: number): string {
  const d = getDict(p.locale);
  const amount = formatBaht(p.amount, p.locale);
  const message = [...p.message].slice(0, maxChars).join("");
  const text = p.productTitle
    ? fmt(d.alert.ttsBought, { name: p.name, product: p.productTitle, message })
    : p.unit
      ? fmt(d.alert.ttsGave, { name: p.name, unit: p.unit.name, qty: p.unit.qty, message })
      : fmt(d.alert.tts, { name: p.name, amount, message });
  // Stars from the word filter sound silly read aloud.
  return text.replace(/\*+/g, " ").replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim() || (kind === "test" ? "test" : "");
}
