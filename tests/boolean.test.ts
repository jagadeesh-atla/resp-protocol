import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Boolean", () => {
  test("parses true", () => {
    const msg = "#t\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "boolean", value: true });
  });

  test("parses false", () => {
    const msg = "#f\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "boolean", value: false });
  });
});
