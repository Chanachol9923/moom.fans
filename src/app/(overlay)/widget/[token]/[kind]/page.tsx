import { notFound } from "next/navigation";
import { loadWidgetData } from "@/lib/domain/widgets";
import { isSupabaseConfigured } from "@/lib/env";
import { sampleWidgetData } from "@/lib/sample-widgets";
import { isWidgetKind } from "@moom/shared/widgets";
import { WidgetApp } from "./WidgetApp";

// /widget/<overlay token>/<goal|recent|top|qr|poll|subathon|wheel>
// /widget/demo/<kind> shows sample data without a database.
// ?preview=1 (dashboard cards): the wheel spins its own labels on a loop instead of waiting.
export default async function WidgetPage({ params, searchParams }: PageProps<"/widget/[token]/[kind]">) {
  const { token, kind } = await params;
  if (!isWidgetKind(kind)) notFound();
  const sp = await searchParams;
  if (token === "demo") {
    return <WidgetApp token="demo" kind={kind} initial={sampleWidgetData(sp.lang === "en" ? "en" : "th")} demo preview />;
  }
  if (!isSupabaseConfigured()) notFound();
  const data = await loadWidgetData(token);
  if (!data) notFound();
  return <WidgetApp token={token} kind={kind} initial={data} preview={sp.preview === "1"} />;
}
