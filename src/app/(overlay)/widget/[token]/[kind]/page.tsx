import { notFound } from "next/navigation";
import { loadWidgetData } from "@/lib/domain/widgets";
import { isSupabaseConfigured } from "@/lib/env";
import { sampleWidgetData } from "@/lib/sample-widgets";
import { isWidgetKind } from "@moom/shared/widgets";
import { WidgetApp } from "./WidgetApp";

// /widget/<overlay token>/<goal|recent|top|qr|poll|subathon>
// /widget/demo/<kind> shows sample data without a database.
export default async function WidgetPage({ params, searchParams }: PageProps<"/widget/[token]/[kind]">) {
  const { token, kind } = await params;
  if (!isWidgetKind(kind)) notFound();
  if (token === "demo") {
    const sp = await searchParams;
    return <WidgetApp token="demo" kind={kind} initial={sampleWidgetData(sp.lang === "en" ? "en" : "th")} demo />;
  }
  if (!isSupabaseConfigured()) notFound();
  const data = await loadWidgetData(token);
  if (!data) notFound();
  return <WidgetApp token={token} kind={kind} initial={data} />;
}
