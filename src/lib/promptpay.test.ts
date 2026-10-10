import generatePayload from "promptpay-qr";
import { describe, expect, it } from "vitest";
import {
  crc16,
  detectPromptPayType,
  isValidNationalId,
  maskPromptPayId,
  promptPayPayload,
} from "./promptpay";

describe("crc16", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("promptPayPayload", () => {
  // Cross-checked against the widely used `promptpay-qr` package.
  const cases: Array<[Parameters<typeof promptPayPayload>[0], string, { amount?: number }]> = [
    [{ type: "phone", id: "0812345678", amount: 50 }, "0812345678", { amount: 50 }],
    [{ type: "phone", id: "081-234-5678" }, "0812345678", {}],
    [{ type: "national_id", id: "1234567890123", amount: 100.25 }, "1234567890123", { amount: 100.25 }],
    [{ type: "ewallet", id: "004999000288505", amount: 1 }, "004999000288505", { amount: 1 }],
  ];

  it.each(cases)("%o", (input, id, opts) => {
    expect(promptPayPayload(input)).toBe(generatePayload(id, opts));
  });

  it("uses a dynamic QR (12) only when an amount is set", () => {
    expect(promptPayPayload({ type: "phone", id: "0812345678", amount: 20 })).toContain("010212");
    expect(promptPayPayload({ type: "phone", id: "0812345678" })).toContain("010211");
  });

  it("rejects non-positive amounts", () => {
    expect(() => promptPayPayload({ type: "phone", id: "0812345678", amount: 0 })).toThrow();
    expect(() => promptPayPayload({ type: "phone", id: "0812345678", amount: NaN })).toThrow();
  });
});

describe("helpers", () => {
  it("detects the id type", () => {
    expect(detectPromptPayType("081-234-5678")).toBe("phone");
    expect(detectPromptPayType("1234567890123")).toBe("national_id");
    expect(detectPromptPayType("004999000288505")).toBe("ewallet");
    expect(detectPromptPayType("12345")).toBeNull();
  });

  it("validates Thai national id checksums", () => {
    expect(isValidNationalId("1101700230708")).toBe(true);
    expect(isValidNationalId("1101700230705")).toBe(false);
  });

  it("masks ids", () => {
    expect(maskPromptPayId("phone", "0812345678")).toBe("081-xxx-5678");
    expect(maskPromptPayId("national_id", "1234567890123")).toBe("xxxxxxxxx0123");
  });
});
