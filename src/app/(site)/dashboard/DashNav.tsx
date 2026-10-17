"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@moom/shared/i18n/react";

export function DashNav({ pending }: { pending: number }) {
  const { d } = useT();
  const path = usePathname();
  const groups: Array<{ label?: string; items: Array<{ href: string; label: string; badge?: number }> }> = [
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
        { href: "/dashboard/widgets", label: d.nav.widgets },
        { href: "/dashboard/fun", label: d.nav.fun },
        { href: "/dashboard/pets", label: d.nav.pets },
        { href: "/dashboard/vts", label: d.nav.vts },
      ],
    },
    { items: [{ href: "/dashboard/settings", label: d.nav.settings }] },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-3 md:overflow-visible md:pb-0">
      {groups.map((g, gi) => (
        <div key={gi} className="flex shrink-0 gap-1 md:flex-col">
          {g.label && <div className="hidden px-3 pt-1 font-display text-xs text-ink-faint md:block">{g.label}</div>}
          {g.items.map((it) => {
            const active = it.href === "/dashboard" ? path === it.href : path.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 font-display text-sm ${
                  active ? "bg-ink text-paper" : "hover:bg-paper-2"
                }`}
              >
                <span>
                  {active ? "▸ " : ""}
                  {it.label}
                </span>
                {it.badge ? <span className="bg-tomato px-1.5 text-xs text-paper">{it.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
