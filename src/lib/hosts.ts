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

export function rootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
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
