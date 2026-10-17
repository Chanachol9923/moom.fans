import { describe, expect, it } from "vitest";
import { totalsByOption } from "./wall";

// The sums themselves live in SQL and are tested in tests/db/migrations.test.ts.
describe("totalsByOption", () => {
  it("places totals by option index and fills gaps with 0", () => {
    expect(totalsByOption(3, [{ option: 2, total: "30.5" }, { option: 0, total: 10 }])).toEqual([10, 0, 30.5]);
  });

  it("ignores options that no longer exist", () => {
    expect(totalsByOption(2, [{ option: 5, total: 99 }])).toEqual([0, 0]);
  });
});
