import { describe, test, expect } from "bun:test";
import { RESP } from "../parser";

describe("Redis Integer Parser", () => {
  test("parse 1234", () => {
    const msg = ":1234\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "integer", value: 1234 });
    expect(res.index).toBe(msg.length);
  });

  test("parse +1234", () => {
    const msg = ":+1234\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "integer", value: 1234 });
    expect(res.index).toBe(msg.length);
  });

  test("parse -1234", () => {
    const msg = ":-1234\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    expect(res.result).toEqual({ type: "integer", value: -1234 });
    expect(res.index).toBe(msg.length);
  });
});
