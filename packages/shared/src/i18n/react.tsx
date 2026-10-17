"use client";
import { createContext, useContext, type ReactNode } from "react";
import { getDict, type Dict, type Locale } from "./index";

const Ctx = createContext<{ locale: Locale; d: Dict }>({ locale: "th", d: getDict("th") });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={{ locale, d: getDict(locale) }}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}
