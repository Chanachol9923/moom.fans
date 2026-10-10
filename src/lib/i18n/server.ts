import "server-only";
import { cookies, headers } from "next/headers";
import { getDict, isLocale, LOCALE_COOKIE, pickLocale, type Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return pickLocale((await headers()).get("accept-language"));
}

export async function getT() {
  const locale = await getLocale();
  return { locale, d: getDict(locale) };
}
