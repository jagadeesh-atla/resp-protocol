import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Set", () => {
  test("parses set", () => {
    const msg = "~2\r\n+first\r\n:1\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({
      type: "set",
      value: [
        { type: "simple_string", value: "first" },
        { type: "integer", value: 1 },
      ],
    });
  });
});
