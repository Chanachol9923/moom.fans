"use client";
import { useState, useSyncExternalStore } from "react";
import { cx } from "@moom/shared/ui/kit";

export type FunTab = {
  id: string;
  name: string;
  what: string;
  status: string;
  on: boolean;
  body: React.ReactNode;
};

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/**
 * One tool at a time. Each tab says in a line what the tool does and whether it is on,
 * so nobody has to read three long forms to find out. #wheel / #poll / #subathon open a tab.
 */
export function FunTabs({ tabs }: { tabs: FunTab[] }) {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => "");
  const [picked, setPicked] = useState<string | null>(null);
  const current = tabs.find((t) => t.id === (picked ?? hash)) ?? tabs[0];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3" role="tablist">
        {tabs.map((t) => {
          const active = t.id === current.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setPicked(t.id);
                history.replaceState(null, "", `#${t.id}`);
              }}
              className={cx("px-frame grid gap-1 p-3 text-left", active ? "bg-ink text-paper" : "bg-paper hover:bg-paper-2")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-lg">{t.name}</span>
                <span
                  className={cx(
                    "px-1.5 text-xs font-semibold",
                    t.on ? "bg-leaf text-paper" : active ? "bg-paper/20 text-paper" : "bg-paper-2 text-ink-soft",
                  )}
                >
                  {t.status}
                </span>
              </span>
              <span className={cx("text-sm", active ? "text-paper/80" : "text-ink-soft")}>{t.what}</span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current.body}</div>
    </div>
  );
}
