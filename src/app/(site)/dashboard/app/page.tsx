import Link from "next/link";
import { Panel, buttonClass } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

// Where the installer will be offered. Until a signed build exists, it says so
// and points at Lite mode (the web overlay) instead of a dead download link.
const DOWNLOAD_URL = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ?? "";

export default async function AppPage() {
  await requireStreamer();
  const { d } = await getT();
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.appPage.title}</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{d.appPage.body}</p>
      </div>
      <Panel>
        {DOWNLOAD_URL ? (
          <a href={DOWNLOAD_URL} className={buttonClass("primary")}>
            ↓ {d.appPage.download}
          </a>
        ) : (
          <p className="bg-beak/30 p-3 text-sm">
            {d.appPage.notReady}{" "}
            <Link href="/dashboard/overlay" className="underline">
              {d.nav.overlay} →
            </Link>
          </p>
        )}
      </Panel>
      <Panel title={d.appPage.stepsTitle}>
        <ol className="grid gap-2">
          {[d.appPage.step1, d.appPage.step2, d.appPage.step3].map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="grid size-6 shrink-0 place-items-center bg-ink font-display text-xs text-paper">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-ink-faint">{d.appPage.syncNote}</p>
      </Panel>
    </div>
  );
}
