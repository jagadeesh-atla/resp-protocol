import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Push", () => {
  test("parses push", () => {
    const msg = ">2\r\n+first\r\n:1\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({
      type: "push",
      value: [
        { type: "simple_string", value: "first" },
        { type: "integer", value: 1 },
      ],
    });
  });
});
