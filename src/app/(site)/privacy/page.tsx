import type { Metadata } from "next";
import { DocView } from "@/components/DocView";
import { PRIVACY } from "@/content/pages";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const { locale } = await getT();
  return <DocView doc={PRIVACY[locale]} />;
}
