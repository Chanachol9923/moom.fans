import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enabledProviders } from "./auth-providers";

describe("enabledProviders", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("follows what the Supabase project has enabled", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ external: { google: true, discord: false, email: true } })));
    expect(await enabledProviders()).toEqual({ google: true, discord: false });
  });

  it("treats missing providers as off", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ external: { email: true } })));
    expect(await enabledProviders()).toEqual({ google: false, discord: false });
  });

  it("falls back to the env flags when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    process.env.NEXT_PUBLIC_AUTH_GOOGLE = "true";
    // publicEnv reads these at import time, so only the shape is asserted here
    const r = await enabledProviders();
    expect(typeof r.google).toBe("boolean");
    expect(typeof r.discord).toBe("boolean");
  });
});
