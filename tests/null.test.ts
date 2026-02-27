import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Null", () => {
  test("parses null", () => {
    const msg = "_\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "null", value: null });
  });
});
