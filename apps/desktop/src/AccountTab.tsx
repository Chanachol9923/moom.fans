import { useT } from "@moom/shared/i18n/react";
import { Button, Panel } from "@moom/shared/ui/kit";
import { openExternal } from "./platform";
import { SITE, supabase } from "./session";

export function AccountTab({ name, email }: { name: string; email: string }) {
  const { d } = useT();
  // Account settings stay on the web for now; the app reads them and picks up changes live.
  const links: Array<[string, string]> = [
    [d.nav.overlay, "/dashboard/overlay"],
    [d.nav.pets, "/dashboard/pets"],
    [d.nav.vts, "/dashboard/vts"],
    [d.nav.review, "/dashboard/review"],
    [d.nav.page, "/dashboard/page"],
  ];
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="font-display text-xl">{name}</div>
        <div className="text-sm text-ink-faint">{email}</div>
        <p className="mt-3 text-sm text-ink-soft">{d.desktop.accountNote}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {links.map(([label, path]) => (
            <button
              key={path}
              type="button"
              onClick={() => openExternal(`${SITE}${path}`)}
              className="px-frame flex items-center justify-between bg-paper-2 px-3 py-2 text-left hover:bg-paper-3"
            >
              <span>{label}</span>
              <span aria-hidden>↗</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => openExternal(`${SITE}/dashboard`)}>
            {d.desktop.openWeb}
          </Button>
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
            {d.desktop.signOut}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
