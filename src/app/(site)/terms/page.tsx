import type { Metadata } from "next";
import { DocView } from "@/components/DocView";
import { TERMS } from "@/content/pages";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Terms" };

export default async function TermsPage() {
  const { locale } = await getT();
  return <DocView doc={TERMS[locale]} />;
}
