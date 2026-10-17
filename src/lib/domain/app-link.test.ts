import { describe, expect, it } from "vitest";
import { challengeFor, CHALLENGE_RE } from "./app-link";

describe("PKCE challenge", () => {
  it("matches the RFC 7636 appendix B example", () => {
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("always produces a 43-char base64url string", () => {
    expect(challengeFor("x".repeat(64))).toMatch(CHALLENGE_RE);
  });
});
