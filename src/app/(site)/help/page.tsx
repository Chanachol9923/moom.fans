import type { Metadata } from "next";
import { DocView } from "@/components/DocView";
import { HELP } from "@/content/pages";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Help" };

export default async function HelpPage() {
  const { locale } = await getT();
  return <DocView doc={HELP[locale]} />;
}
