import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Array", () => {
  test("parses empty array", () => {
    const msg = "*0\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "array", value: [] });
  });

  test("parses array of strings", () => {
    const msg = "*2\r\n$5\r\nhello\r\n$5\r\nworld\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({
      type: "array",
      value: [
        { type: "bulk_string", value: "hello" },
        { type: "bulk_string", value: "world" },
      ],
    });
  });

  test("parses mixed array", () => {
    const msg = "*3\r\n:123\r\n+OK\r\n$-1\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({
      type: "array",
      value: [
        { type: "integer", value: 123 },
        { type: "simple_string", value: "OK" },
        { type: "bulk_string", value: null },
      ],
    });
  });

  test("parses null array", () => {
    const msg = "*-1\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "array", value: null });
  });
});
