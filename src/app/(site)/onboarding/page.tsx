import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Panel } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { rootDomain } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { getUser } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/dashboard");
  const { d } = await getT();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <Panel title={d.onboarding.title} raised>
          <p className="mb-5 text-ink-soft">{d.onboarding.subtitle}</p>
          <OnboardingForm rootDomain={rootDomain()} />
        </Panel>
      </main>
    </>
  );
}
