import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyHost, creatorUrl, siteUrl, subdomainsEnabled } from "@/lib/hosts";

// Routing by host:
//   <slug>.<root>/...      -> rewritten to /s/<slug>/...   (creator storefront)
//   <root>/s/<slug>/...    -> redirected to the subdomain   (one canonical URL)
//   <root>/dashboard etc.  -> normal routes, with the Supabase session refreshed

const ROOT_ONLY = /^\/(dashboard|login|onboarding|auth|overlay)(\/|$)/;
const NEEDS_SESSION = /^\/(dashboard|onboarding|login|auth)(\/|$)/;

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const subdomains = subdomainsEnabled();
  const host = subdomains ? classifyHost(request.headers.get("host")) : ({ kind: "root" } as const);

  if (host.kind === "unknown") return new NextResponse("Not found", { status: 404 });

  if (host.kind === "creator") {
    if (url.pathname.startsWith("/api/")) return NextResponse.next();
    if (ROOT_ONLY.test(url.pathname)) {
      return NextResponse.redirect(siteUrl(url.pathname + url.search));
    }
    const rest = url.pathname === "/" ? "" : url.pathname;
    return NextResponse.rewrite(new URL(`/s/${host.slug}${rest}${url.search}`, request.url));
  }

  if (subdomains && url.pathname.startsWith("/s/")) {
    const [, , slug, ...rest] = url.pathname.split("/");
    if (slug) return NextResponse.redirect(creatorUrl(slug, `/${rest.join("/")}${url.search}`));
  }

  if (NEEDS_SESSION.test(url.pathname)) return refreshSession(request);
  return NextResponse.next();
}

/** @supabase/ssr pattern: refresh the auth cookie before server components read it. */
async function refreshSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  // getClaims() verifies the JWT locally (asymmetric signing key) and only calls the
  // Auth server when the access token needs refreshing.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp3|ogg|wav|txt)$).*)"],
};
