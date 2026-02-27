import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";
import { decode, encode, encodeCommand } from "../codec";

describe("RESP Codec", () => {
  test("decode simple types", () => {
    expect(decode({ type: "integer", value: 123 })).toBe(123);
    expect(decode({ type: "simple_string", value: "OK" })).toBe("OK");
    expect(decode({ type: "boolean", value: true })).toBe(true);
    expect(decode({ type: "null", value: null })).toBe(null);
  });

  test("decode complex types", () => {
    const arrayResp: any = {
      type: "array",
      value: [
        { type: "integer", value: 1 },
        { type: "simple_string", value: "test" },
      ],
    };
    expect(decode(arrayResp)).toEqual([1, "test"]);
  });

  test("encode simple types", () => {
    expect(encode(123)).toBe(":123\r\n");
    expect(encode(true)).toBe("#t\r\n");
    expect(encode(null)).toBe("_\r\n");
  });

  test("encode strings as bulk strings", () => {
    expect(encode("hello")).toBe("$5\r\nhello\r\n");
  });

  test("encode command", () => {
    expect(encodeCommand(["SET", "key", "value"])).toBe(
      "*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n",
    );
  });

  test("full roundtrip: encode -> parse -> decode", () => {
    const original = ["GET", "mykey"];
    const wire = encode(original);
    const parsed = RESP.run(wire);

    expect(parsed.isError).toBe(false);
    const result = decode(parsed.result as any);
    expect(result).toEqual(original);
  });
});
