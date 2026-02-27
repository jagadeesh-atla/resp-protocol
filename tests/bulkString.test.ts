import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Bulk String Parser", () => {
  test("parses normal bulk string", () => {
    const msg = "$5\r\nhello\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "bulk_string", value: "hello" });
    expect(res.index).toBe(msg.length);
  });

  test("parses empty bulk string", () => {
    const msg = "$0\r\n\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "bulk_string", value: "" });
    expect(res.index).toBe(msg.length);
  });

  test("parses null bulk string", () => {
    const msg = "$-1\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "bulk_string", value: null });
    expect(res.index).toBe(msg.length);
  });
});
