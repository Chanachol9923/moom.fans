import Link from "next/link";
import type { ReactNode } from "react";
import { fmt } from "@moom/shared/i18n";
import { CopyField } from "@moom/shared/ui/CopyField";
import { Panel, cx } from "@moom/shared/ui/kit";
import { ActionButton } from "@/components/ActionButton";
import { getT } from "@/lib/i18n/server";
import { sendTestAlert } from "./actions";

export type SetupState = { styled: boolean; obs: boolean; firstTip: boolean };

/**
 * The first things to do, ticked off from what has really happened (a tip came in, an
 * overlay played an alert), each with the one button it needs. Gone once all are done.
 */
export async function SetupChecklist({ state, pageUrl, overlayUrl }: { state: SetupState; pageUrl: string; overlayUrl: string }) {
  const { d } = await getT();
  const S = d.dash.setup;
  const steps = [true, state.styled, state.obs, state.firstTip];
  const done = steps.filter(Boolean).length;
  // The first step not done yet is the one to open.
  const next = steps.findIndex((s) => !s);

  return (
    <Panel title={fmt(S.title, { done, total: steps.length })}>
      <div className="mb-3 h-3 bg-paper-3" aria-hidden>
        <div className="h-full bg-leaf" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="grid gap-2">
        <Step n={1} done title={S.pageTitle} open={next === 0}>
          <p>{S.pageBody}</p>
          <CopyField value={pageUrl} />
        </Step>
        <Step n={2} done={state.styled} title={S.styleTitle} open={next === 1}>
          <p>{S.styleBody}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/settings" className="px-btn px-btn-sm px-btn-primary">
              {S.pictureAction} →
            </Link>
            <Link href="/dashboard/page" className="px-btn px-btn-sm">
              {S.styleAction} →
            </Link>
          </div>
        </Step>
        <Step n={3} done={state.obs} title={S.obsTitle} open={next === 2}>
          <ol className="list-decimal space-y-1 pl-5">
            <li>{S.obs1}</li>
            <li>{S.obs2}</li>
            <li>{S.obs3}</li>
          </ol>
          <CopyField value={overlayUrl} secret />
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton size="sm" variant="primary" action={sendTestAlert.bind(null, "tip")}>
              {S.obsTest}
            </ActionButton>
            <Link href="/dashboard/app" className="text-sm underline">
              {S.obsApp}
            </Link>
          </div>
          <p className="text-sm text-ink-faint">{S.obsTrouble}</p>
        </Step>
        <Step n={4} done={state.firstTip} title={S.shareTitle} open={next === 3}>
          <p>{S.shareBody}</p>
          <CopyField value={pageUrl} />
        </Step>
      </ol>
    </Panel>
  );
}

function Step({ n, done, title, open, children }: { n: number; done: boolean; title: string; open: boolean; children: ReactNode }) {
  return (
    <li>
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hidden">
          <span
            className={cx(
              "grid size-6 shrink-0 place-items-center font-display text-xs",
              done ? "bg-leaf text-paper" : "bg-ink text-paper",
            )}
            aria-hidden
          >
            {done ? "✓" : n}
          </span>
          <span className={cx("flex-1 font-display", done && "text-ink-soft line-through decoration-2")}>{title}</span>
          <span className="text-ink-faint group-open:rotate-90" aria-hidden>
            ▸
          </span>
        </summary>
        <div className="grid gap-2 pt-1 pb-3 pl-8">{children}</div>
      </details>
    </li>
  );
}
