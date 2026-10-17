import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Panel } from "@/components/ui";
import { CHALLENGE_RE } from "@/lib/domain/app-link";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { getUser } from "@/lib/supabase/server";
import { fmt } from "@moom/shared/i18n";
import { ConnectApprove } from "./ConnectApprove";

export const metadata: Metadata = { title: "Connect app", robots: { index: false, follow: false } };

// The desktop app opens this page in the system browser:
//   /app/connect?state=<random>&challenge=<base64url sha256(verifier)>&device=<name>
export default async function ConnectPage({ searchParams }: PageProps<"/app/connect">) {
  const { d } = await getT();
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : "";
  const challenge = typeof sp.challenge === "string" ? sp.challenge : "";
  const device = typeof sp.device === "string" ? sp.device.slice(0, 60) : "";
  const valid = /^[A-Za-z0-9_-]{16,64}$/.test(state) && CHALLENGE_RE.test(challenge);

  if (valid && isSupabaseConfigured()) {
    const { supabase, user } = await getUser();
    if (!user) {
      const back = `/app/connect?${new URLSearchParams({ state, challenge, device }).toString()}`;
      redirect(`/login?next=${encodeURIComponent(back)}`);
    }
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    if (!profile) redirect("/onboarding");

    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-md px-4 py-10">
          <Panel title={d.appLink.title} raised>
            <p className="text-lg">
              {fmt(d.appLink.body, { device: device || d.appLink.unknownDevice, name: profile.display_name })}
            </p>
            <div className="mt-4 px-label">{d.appLink.can}</div>
            <ul className="grid gap-1.5">
              {[d.appLink.can1, d.appLink.can2, d.appLink.can3].map((line) => (
                <li key={line} className="flex gap-2 text-ink-soft">
                  <span className="mt-2 size-2 shrink-0 bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-faint">{d.appLink.cannot}</p>
            <ConnectApprove state={state} challenge={challenge} device={device} />
          </Panel>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <Panel title={d.appLink.title}>
          <p className="text-tomato">{d.appLink.invalid}</p>
        </Panel>
      </main>
    </>
  );
}
