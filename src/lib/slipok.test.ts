import { describe, expect, it } from "vitest";
import { parseSlipOkResponse, slipProblems } from "./slipok";

const ok = {
  success: true,
  data: {
    success: true,
    transRef: "016300000000ABCD1234",
    transDate: "20260930",
    transTime: "12:30:00",
    amount: 100,
    receiver: { displayName: "นาย ก", proxy: { type: "MSISDN", value: "xxx-xxx-5678" } },
  },
};

describe("parseSlipOkResponse", () => {
  it("reads a successful slip", () => {
    const r = parseSlipOkResponse(ok);
    expect(r.status).toBe("read");
    if (r.status !== "read") return;
    expect(r.transRef).toBe("016300000000ABCD1234");
    expect(r.amount).toBe(100);
    expect(r.paidAt?.toISOString()).toBe("2026-09-30T05:30:00.000Z");
    expect(r.receiverHint).toBe("xxx-xxx-5678");
  });

  it("turns error codes into an error result", () => {
    const r = parseSlipOkResponse({ success: false, code: 1012, message: "duplicate slip" });
    expect(r).toMatchObject({ status: "error", reason: "duplicate slip" });
  });

  it("survives garbage", () => {
    expect(parseSlipOkResponse("nope").status).toBe("error");
    expect(parseSlipOkResponse({ data: { amount: "x" } }).status).toBe("error");
  });
});

describe("slipProblems", () => {
  const slip = parseSlipOkResponse(ok);
  if (slip.status !== "read") throw new Error("fixture");
  const expected = {
    amount: 100,
    promptpayId: "0812345678",
    createdAt: new Date("2026-09-30T05:25:00Z"),
  };

  it("passes a matching slip", () => {
    expect(slipProblems(slip, expected)).toEqual([]);
  });

  it("flags wrong amount, receiver and old slips", () => {
    expect(slipProblems(slip, { ...expected, amount: 99 })[0]).toMatch(/amount/);
    expect(slipProblems(slip, { ...expected, promptpayId: "0899990000" })[0]).toMatch(/receiver/);
    expect(
      slipProblems(slip, { ...expected, createdAt: new Date("2026-09-30T06:00:00Z") })[0],
    ).toMatch(/older/);
  });
});
