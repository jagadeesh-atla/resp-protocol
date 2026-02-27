import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis SimpleString", () => {
  test("parses OK", () => {
    const msg = "+OK\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "simple_string", value: "OK" });
    expect(res.index).toBe(msg.length);
  });

  test("parses PONG", () => {
    const msg = "+PONG\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "simple_string", value: "PONG" });
    expect(res.index).toBe(msg.length);
  });

  test("fails without + prefix", () => {
    const res = RESP.run("OK\r\n");
    expect(res.isError || (res.result as any).type !== "simple_string").toBe(
      true,
    );
  });

  test("fails without CRLF", () => {
    const res = RESP.run("+OK");
    expect(res.isError).toBe(true);
  });
});
