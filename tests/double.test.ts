import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Double", () => {
  test("parses double", () => {
    const msg = ",1.23\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "double", value: 1.23 });
  });

  test("parses infinity", () => {
    const msg = ",inf\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "double", value: Infinity });
  });
});
