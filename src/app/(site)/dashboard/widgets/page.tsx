import Link from "next/link";
import { CopyField } from "@moom/shared/ui/CopyField";
import { Panel, buttonClass } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { getPrivate } from "@/lib/domain/streamer";
import { siteUrl } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { WIDGET_KINDS, WIDGET_SIZES, type WidgetKind } from "@moom/shared/widgets";
import { PreviewFrame } from "../overlay/PreviewFrame";
import { ensureWidgetDefaults } from "@/lib/domain/defaults";
import { parseWheel } from "@moom/shared/wheel";
import { WheelPlacePicker } from "../fun/WheelPlacePicker";

/** Where each widget's content and look are set. */
const SETTINGS: Record<WidgetKind, string> = {
  goal: "/dashboard/goals",
  recent: "/dashboard/page#wall",
  top: "/dashboard/page#wall",
  qr: "/dashboard/page",
  poll: "/dashboard/fun#poll",
  subathon: "/dashboard/fun#subathon",
  wheel: "/dashboard/fun#wheel",
};

export default async function WidgetsPage() {
  const { supabase, profile } = await requireStreamer();
  const { d } = await getT();
  const [priv, , { data: s }] = await Promise.all([
    getPrivate(profile.id),
    ensureWidgetDefaults(supabase, profile.id, profile.locale),
    supabase.from("overlay_settings").select("wheel").eq("streamer_id", profile.id).maybeSingle(),
  ]);
  const wheel = parseWheel(s?.wheel);
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.widgets.title}</h1>
        <p className="mt-1 text-ink-soft">{d.widgets.subtitle}</p>
        <p className="mt-1 text-sm text-ink-faint">{d.widgets.sameSecret}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {WIDGET_KINDS.map((k) => {
          const [w, h] = WIDGET_SIZES[k];
          const url = siteUrl(`/widget/${priv.overlay_token}/${k}`);
          return (
            <Panel
              key={k}
              title={d.widgets.kinds[k].name}
              aside={
                <Link href={SETTINGS[k]} className={buttonClass("default", "sm")}>
                  {d.widgets.settings}
                </Link>
              }
            >
              <p className="mb-2 text-sm text-ink-soft">{d.widgets.kinds[k].desc}</p>
              {k === "wheel" && (
                <>
                  <WheelPlacePicker place={wheel.place} />
                  {wheel.place === "overlay" && <p className="mb-2 text-sm text-ink-soft">{d.widgets.wheelOnOverlay}</p>}
                  {!wheel.enabled && (
                    <p className="mb-2 text-sm text-ink-soft">
                      {d.widgets.wheelOff}{" "}
                      <Link href="/dashboard/fun#wheel" className="underline">
                        {d.widgets.wheelTurnOn}
                      </Link>
                    </p>
                  )}
                </>
              )}
              <PreviewFrame src={k === "wheel" ? `${url}?preview=1` : url} width={w} height={h} />
              <div className="mt-3">
                <CopyField value={url} secret />
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                {d.widgets.size}: <span className="font-num">{w}×{h}</span>
              </p>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
