"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@moom/shared/i18n/react";
import { cx } from "@moom/shared/ui/kit";

type Item = { href: string; label: string; badge?: number };
type Group = { label?: string; items: Item[] };

const isActive = (path: string, href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

/**
 * Sidebar on desktop. On phones, where streamers check slips mid-stream, a bottom tab bar
 * with the four places they go most and a Menu sheet with everything else.
 */
export function DashNav({ pending }: { pending: number }) {
  const { d } = useT();
  const path = usePathname();
  const groups: Group[] = [
    { items: [{ href: "/dashboard", label: d.nav.overview }] },
    {
      label: d.nav.groupMoney,
      items: [
        { href: "/dashboard/review", label: d.nav.review, badge: pending },
        { href: "/dashboard/ledger", label: d.nav.ledger },
        { href: "/dashboard/supporters", label: d.nav.supporters },
      ],
    },
    {
      label: d.nav.groupShop,
      items: [
        { href: "/dashboard/page", label: d.nav.page },
        { href: "/dashboard/products", label: d.nav.products },
        { href: "/dashboard/goals", label: d.nav.goals },
      ],
    },
    {
      label: d.nav.groupLive,
      items: [
        { href: "/dashboard/app", label: d.nav.app },
        { href: "/dashboard/overlay", label: d.nav.overlay },
        { href: "/dashboard/alerts", label: d.nav.alerts },
        { href: "/dashboard/widgets", label: d.nav.widgets },
        { href: "/dashboard/fun", label: d.nav.fun },
        { href: "/dashboard/pets", label: d.nav.pets },
        { href: "/dashboard/vts", label: d.nav.vts },
      ],
    },
    { items: [{ href: "/dashboard/settings", label: d.nav.settings }] },
  ];

  return (
    <>
      <nav className="hidden flex-col gap-3 md:flex">
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {g.label && <div className="px-3 pt-1 font-display text-xs text-ink-faint">{g.label}</div>}
            {g.items.map((it) => (
              <NavLink key={it.href} it={it} active={isActive(path, it.href)} />
            ))}
          </div>
        ))}
      </nav>
      <MobileNav groups={groups} pending={pending} path={path} />
    </>
  );
}

function NavLink({ it, active }: { it: Item; active: boolean }) {
  return (
    <Link
      href={it.href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center justify-between gap-2 px-3 py-1.5 font-display text-sm",
        active ? "bg-ink text-paper" : "hover:bg-paper-2",
      )}
    >
      <span>
        {active ? "▸ " : ""}
        {it.label}
      </span>
      {it.badge ? <span className="bg-tomato px-1.5 text-xs text-paper">{it.badge}</span> : null}
    </Link>
  );
}

function MobileNav({ groups, pending, path }: { groups: Group[]; pending: number; path: string }) {
  const { d } = useT();
  const [open, setOpen] = useState(false);
  // Close the sheet after navigating.
  const [at, setAt] = useState(path);
  if (at !== path) {
    setAt(path);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const live = ["/dashboard/app", "/dashboard/overlay", "/dashboard/alerts", "/dashboard/widgets", "/dashboard/fun", "/dashboard/pets", "/dashboard/vts"];
  const tabs: Array<{ href: string; label: string; icon: Icon; badge?: number; active: boolean }> = [
    { href: "/dashboard", label: d.nav.overview, icon: "home", active: path === "/dashboard" },
    { href: "/dashboard/review", label: d.nav.review, icon: "check", badge: pending, active: path.startsWith("/dashboard/review") },
    { href: "/dashboard/page", label: d.nav.groupShop, icon: "shop", active: ["/dashboard/page", "/dashboard/products", "/dashboard/goals"].some((h) => path.startsWith(h)) },
    { href: "/dashboard/overlay", label: d.nav.groupLive, icon: "live", active: live.some((h) => path.startsWith(h)) },
  ];

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t-[3px] border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label={d.nav.menu}
      >
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cx("relative flex flex-col items-center gap-0.5 py-2 font-display text-[11px]", t.active ? "bg-ink text-paper" : "text-ink")}
          >
            <PixelIcon name={t.icon} />
            <span className="max-w-full truncate px-1">{t.label}</span>
            {t.badge ? (
              <span className="absolute top-1 right-[18%] min-w-4 bg-tomato px-1 text-center text-[10px] leading-4 text-paper">{t.badge}</span>
            ) : null}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cx("flex flex-col items-center gap-0.5 py-2 font-display text-[11px]", open && "bg-ink text-paper")}
        >
          <PixelIcon name="menu" />
          <span>{d.nav.menu}</span>
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto border-t-[3px] border-ink bg-paper px-4 pt-4 pb-24"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {groups.slice(1).map((g, gi) => (
                <div key={gi} className={cx("flex flex-col gap-1", !g.label && "col-span-2")}>
                  {g.label && <div className="px-3 font-display text-xs text-ink-faint">{g.label}</div>}
                  {g.items.map((it) => (
                    <NavLink key={it.href} it={it} active={isActive(path, it.href)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type Icon = "home" | "check" | "shop" | "live" | "menu";

/** 8×8 pixel glyphs, drawn rather than emoji so they match the rest of Moom. */
function PixelIcon({ name }: { name: Icon }) {
  const paths: Record<Icon, string> = {
    home: "M3 0h2v1h1v1h1v1h1v1h-1v4h-2v-3h-2v3h-2v-4h-1v-1h1v-1h1v-1h1z",
    check: "M6 1h2v2h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-2h2v1h1v-1h1v-1h1v-1h1z",
    shop: "M1 0h6v1h1v2h-1v5h-6v-5h-1v-2h1zM3 5v3h2v-3z",
    live: "M0 1h8v5h-3v1h1v1h-4v-1h1v-1h-3zM1 2v3h6v-3z",
    menu: "M0 1h8v1h-8zM0 4h8v1h-8zM0 7h8v1h-8z",
  };
  return (
    <svg viewBox="0 0 8 8" className="size-5" shapeRendering="crispEdges" aria-hidden>
      <path d={paths[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
