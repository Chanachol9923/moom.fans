import { describe, expect, it } from "vitest";
import { classifyHost, isValidSlug, protocolFor } from "./hosts";

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
