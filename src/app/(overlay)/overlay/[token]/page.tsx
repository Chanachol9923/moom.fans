import { notFound } from "next/navigation";
import { OverlayApp } from "@moom/shared/ui/overlay/OverlayApp";
import { loadOverlayState } from "@/lib/domain/overlay";
import { isSupabaseConfigured } from "@/lib/env";
import { DemoOverlay } from "./DemoOverlay";

export default async function OverlayPage({ params, searchParams }: PageProps<"/overlay/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  if (token === "demo") {
    const style = sp.style === "compact" || sp.style === "banner" ? sp.style : "card";
    return <DemoOverlay locale={sp.lang === "en" ? "en" : "th"} style={style} />;
  }
  if (!isSupabaseConfigured()) notFound();
  const state = await loadOverlayState(token);
  if (!state) notFound();
  return <OverlayApp token={token} initial={state} preview={sp.preview === "1"} />;
}
