import type { Metadata } from "next";
import { fontVars } from "../fonts";
import "../globals.css";
import { I18nProvider } from "@moom/shared/i18n/react";
import { getT } from "@/lib/i18n/server";
import { themeInitScript } from "@moom/shared/theme";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getT();
  return {
    title: { default: `Moom · ${d.landing.tagline}`, template: "%s · Moom" },
    description: d.landing.heroBody,
    icons: { icon: "/icon.svg" },
  };
}

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getT();
  return (
    // data-theme is set by the script before React loads, so the server and client differ there.
    <html lang={locale} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
