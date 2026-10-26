import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext, siteUrl } from "@/lib/hosts";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>(["email", "magiclink", "signup", "invite", "recovery", "email_change"]);

// OAuth and same-browser magic links land here with ?code=... (PKCE).
// Email links built from {{ .TokenHash }} land with ?token_hash=...&type=..., which also
// works when the link is opened on another device than the one that asked for it.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const code = sp.get("code");
  const tokenHash = sp.get("token_hash");
  const type = sp.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let userId: string | undefined;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(siteUrl("/login?error=exchange"));
    userId = data.user?.id;
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return NextResponse.redirect(siteUrl("/login?error=exchange"));
    userId = data.user?.id;
  } else {
    return NextResponse.redirect(siteUrl("/login?error=missing_code"));
  }
  if (!userId) return NextResponse.redirect(siteUrl("/login?error=exchange"));

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  const next = safeNext(sp.get("next"));
  return NextResponse.redirect(siteUrl(profile ? (next ?? "/dashboard") : "/onboarding"));
}
