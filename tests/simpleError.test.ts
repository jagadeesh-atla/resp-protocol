import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis SimpleError", () => {
  test("parses 'ERR message'", () => {
    const msg = "-ERR message\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "simple_error", value: "ERR message" });
    expect(res.index).toBe(msg.length);
  });

  test("parses 'err-message'", () => {
    const msg = "-err-message\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "simple_error", value: "err-message" });
    expect(res.index).toBe(msg.length);
  });

  test("fails without CRLF", () => {
    const res = RESP.run("-OK");
    expect(res.isError).toBe(true);
  });
});
