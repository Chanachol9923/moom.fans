// Host / URL helpers shared by the proxy, server code and client code.
// Everything is driven by NEXT_PUBLIC_ROOT_DOMAIN, e.g. "localhost:3000" in dev
// and "moom.fans" in production.

export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "dashboard", "overlay", "login", "logout", "auth",
  "onboarding", "static", "assets", "cdn", "img", "media", "help", "support", "mail",
  "email", "moom", "status", "docs", "blog", "about", "terms", "privacy", "settings",
  "pay", "shop", "store", "test", "dev", "staging", "root", "system", "official",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !slug.includes("--") && !RESERVED_SLUGS.has(slug);
}

/**
 * Main domain. NEXT_PUBLIC_ROOT_DOMAIN wins; on Vercel it falls back to the project's
 * production URL so a first deploy works before any custom domain exists.
 */
export function rootDomain(): string {
  return (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "localhost:3000"
  ).toLowerCase();
}

/**
 * Streamer pages on <slug>.<root> need a wildcard domain. Without one (e.g. the default
 * *.vercel.app domain) set NEXT_PUBLIC_SUBDOMAINS=false and pages live at <root>/s/<slug>.
 */
export function subdomainsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUBDOMAINS !== "false";
}

/** Prefix for links inside a streamer's pages: "" on a subdomain, "/s/<slug>" in path mode. */
export function storeBasePath(slug: string): string {
  return subdomainsEnabled() ? "" : `/s/${slug}`;
}

function isLocal(domain: string): boolean {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(domain) || domain.endsWith(".localhost") ||
    /\.localhost:\d+$/.test(domain);
}

export function protocolFor(domain: string): "http" | "https" {
  return isLocal(domain) ? "http" : "https";
}

export function siteUrl(path = "/"): string {
  const d = rootDomain();
  return `${protocolFor(d)}://${d}${path}`;
}

export function creatorUrl(slug: string, path = "/"): string {
  const d = rootDomain();
  if (!subdomainsEnabled()) return `${protocolFor(d)}://${d}/s/${slug}${path === "/" ? "" : path}`;
  return `${protocolFor(d)}://${slug}.${d}${path}`;
}

export type HostKind = { kind: "root" } | { kind: "creator"; slug: string } | { kind: "unknown" };

/**
 * Classify an incoming Host header.
 * `alice.moom.fans` -> creator "alice"; `moom.fans` / `www.moom.fans` -> root.
 * Hosts under some other domain (e.g. a *.vercel.app preview) are treated as root
 * so previews still load the main site.
 */
export function classifyHost(hostHeader: string | null, root = rootDomain()): HostKind {
  const host = (hostHeader ?? "").toLowerCase().trim();
  if (!host || host === root || host === `www.${root}`) return { kind: "root" };
  // 127.0.0.1 has no subdomains; treat it as the root in dev.
  if (host.startsWith("127.0.0.1")) return { kind: "root" };
  const suffix = `.${root}`;
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length);
    if (!sub.includes(".") && isValidSlug(sub)) return { kind: "creator", slug: sub };
    return { kind: "unknown" };
  }
  return { kind: "root" };
}
