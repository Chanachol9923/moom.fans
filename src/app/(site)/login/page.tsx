import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Panel } from "@/components/ui";
import { enabledProviders } from "@/lib/auth-providers";
import { isSupabaseConfigured } from "@/lib/env";
import { rootDomain, safeNext } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { getUser } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { d } = await getT();
  const sp = await searchParams;
  const error = sp.error;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const configured = isSupabaseConfigured();
  if (configured && (await getUser()).user) redirect(next ?? "/dashboard");
  const providers = configured ? await enabledProviders() : { discord: false, google: false };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-md px-4 py-10">
        <Panel title={d.auth.title} raised>
          <p className="mb-5 text-ink-soft">{d.auth.subtitle}</p>
          {error && <p className="mb-4 text-tomato">{d.auth.failed}</p>}
          {configured ? (
            <LoginForm
              discord={providers.discord}
              google={providers.google}
              devHint={rootDomain().startsWith("localhost")}
              next={next}
            />
          ) : (
            <p className="bg-beak/40 p-3 text-sm">
              Supabase {d.common.notConfigured}: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              (README → &quot;เริ่มในเครื่อง&quot;)
            </p>
          )}
        </Panel>
      </main>
    </>
  );
}
