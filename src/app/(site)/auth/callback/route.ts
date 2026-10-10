import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/hosts";
import { createClient } from "@/lib/supabase/server";

// Magic links and OAuth both land here with ?code=... (PKCE).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(siteUrl("/login?error=missing_code"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(siteUrl("/login?error=exchange"));

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  return NextResponse.redirect(siteUrl(profile ? "/dashboard" : "/onboarding"));
}
