import Link from "next/link";
import { CopyField } from "@moom/shared/ui/CopyField";
import { Panel, buttonClass } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { getPrivate } from "@/lib/domain/streamer";
import { siteUrl } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { WIDGET_KINDS, WIDGET_SIZES, type WidgetKind } from "@moom/shared/widgets";
import { PreviewFrame } from "../overlay/PreviewFrame";

/** Where each widget's content and look are set. */
const SETTINGS: Record<WidgetKind, string> = {
  goal: "/dashboard/goals",
  recent: "/dashboard/page#wall",
  top: "/dashboard/page#wall",
  qr: "/dashboard/page",
  poll: "/dashboard/fun#poll",
  subathon: "/dashboard/fun#subathon",
};

export default async function WidgetsPage() {
  const { profile } = await requireStreamer();
  const { d } = await getT();
  const priv = await getPrivate(profile.id);
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
              <PreviewFrame src={url} width={w} height={h} />
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
