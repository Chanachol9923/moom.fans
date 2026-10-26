import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Panel } from "@moom/shared/ui/kit";
import { isSupabaseConfigured } from "@/lib/env";
import { rootDomain, subdomainsEnabled } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { getUser } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/dashboard");
  // Sessions are checked locally, so a deleted account still looks signed in. Before
  // offering to create a page for it, ask the auth server whether the account exists.
  const { error } = await supabase.auth.getUser();
  if (error && (error.code === "user_not_found" || error.status === 403 || error.status === 404)) redirect("/auth/gone");
  const { d } = await getT();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <Panel title={d.onboarding.title} raised>
          <p className="mb-5 text-ink-soft">{d.onboarding.subtitle}</p>
          {subdomainsEnabled() ? (
            <OnboardingForm before="" after={`.${rootDomain()}`} />
          ) : (
            <OnboardingForm before={`${rootDomain()}/s/`} after="" />
          )}
        </Panel>
      </main>
    </>
  );
}
