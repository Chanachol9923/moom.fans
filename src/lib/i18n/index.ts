import { en } from "./dict/en";
import { th } from "./dict/th";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";
export const LOCALE_COOKIE = "moom_locale";

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
/** Shape of every dictionary, taken from th.ts. */
export type Dict = Widen<typeof th>;

export function isLocale(v: unknown): v is Locale {
  return v === "th" || v === "en";
}

export function getDict(locale: Locale): Dict {
  return locale === "en" ? en : th;
}

/** "สวัสดี {name}" + { name: "นก" } -> "สวัสดี นก" */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Like fmt, but values may be React nodes (e.g. a styled amount). */
export function fmtParts<T>(template: string, vars: Record<string, T>): Array<string | T> {
  const out: Array<string | T> = [];
  let last = 0;
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    if (!(m[1] in vars)) continue;
    out.push(template.slice(last, m.index), vars[m[1]]);
    last = m.index! + m[0].length;
  }
  out.push(template.slice(last));
  return out.filter((x) => x !== "");
}

export function formatBaht(amount: number, locale: Locale): string {
  const n = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return locale === "th" ? `${n} บาท` : `฿${n}`;
}

export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("en") ? "en" : DEFAULT_LOCALE;
}
