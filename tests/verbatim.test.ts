import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Verbatim", () => {
  test("parses verbatim string", () => {
    const msg = "=15\r\ntxt:Some string\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "verbatim", value: "txt:Some string" });
  });
});
