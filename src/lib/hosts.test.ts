import { afterEach, describe, expect, it } from "vitest";
import { classifyHost, creatorUrl, isValidSlug, protocolFor, storeBasePath, subdomainsEnabled } from "./hosts";

describe("classifyHost", () => {
  it("handles production hosts", () => {
    const root = "moom.fans";
    expect(classifyHost("moom.fans", root)).toEqual({ kind: "root" });
    expect(classifyHost("www.moom.fans", root)).toEqual({ kind: "root" });
    expect(classifyHost("Alice.Moom.Fans", root)).toEqual({ kind: "creator", slug: "alice" });
    expect(classifyHost("a.b.moom.fans", root)).toEqual({ kind: "unknown" });
    expect(classifyHost("api.moom.fans", root)).toEqual({ kind: "unknown" });
    expect(classifyHost("moom-git-main.vercel.app", root)).toEqual({ kind: "root" });
  });

  it("handles local dev hosts", () => {
    const root = "localhost:3000";
    expect(classifyHost("localhost:3000", root)).toEqual({ kind: "root" });
    expect(classifyHost("nok.localhost:3000", root)).toEqual({ kind: "creator", slug: "nok" });
    expect(classifyHost("127.0.0.1:3000", root)).toEqual({ kind: "root" });
  });
});

describe("isValidSlug", () => {
  it.each([
    ["nok", true],
    ["nok-chan", true],
    ["ab", false],
    ["-nok", false],
    ["nok-", false],
    ["no--k", false],
    ["Nok", false],
    ["dashboard", false],
    ["a".repeat(31), false],
  ])("%s -> %s", (slug, ok) => expect(isValidSlug(slug)).toBe(ok));
});

describe("protocolFor", () => {
  it("uses http only for local hosts", () => {
    expect(protocolFor("localhost:3000")).toBe("http");
    expect(protocolFor("moom.fans")).toBe("https");
  });
});

describe("path mode (no wildcard domain)", () => {
  const saved = { sub: process.env.NEXT_PUBLIC_SUBDOMAINS, root: process.env.NEXT_PUBLIC_ROOT_DOMAIN };
  afterEach(() => {
    for (const [k, v] of [["NEXT_PUBLIC_SUBDOMAINS", saved.sub], ["NEXT_PUBLIC_ROOT_DOMAIN", saved.root]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  it("uses subdomains by default", () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "moom.fans";
    expect(subdomainsEnabled()).toBe(true);
    expect(creatorUrl("nok")).toBe("https://nok.moom.fans/");
    expect(storeBasePath("nok")).toBe("");
  });

  it("puts pages under /s/<slug> when switched off", () => {
    process.env.NEXT_PUBLIC_SUBDOMAINS = "false";
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "moom-fans.vercel.app";
    expect(creatorUrl("nok")).toBe("https://moom-fans.vercel.app/s/nok");
    expect(creatorUrl("nok", "/pay/abc")).toBe("https://moom-fans.vercel.app/s/nok/pay/abc");
    expect(storeBasePath("nok")).toBe("/s/nok");
  });

  it("falls back to the Vercel production URL for the root domain", () => {
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "moom-fans.vercel.app";
    process.env.NEXT_PUBLIC_SUBDOMAINS = "false";
    expect(creatorUrl("nok")).toBe("https://moom-fans.vercel.app/s/nok");
  });
});
