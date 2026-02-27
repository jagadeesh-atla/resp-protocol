import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis BigNumber", () => {
  test("parses big number", () => {
    const msg = "(3492890328409238509324850943850943825024385\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({
      type: "bignumber",
      value: "3492890328409238509324850943850943825024385",
    });
  });
});
