import { describe, expect, test } from "bun:test";
import { RESP } from "../parser";

describe("Redis Map", () => {
  test("parses map", () => {
    const msg = "%1\r\n+first\r\n:1\r\n";
    const res = RESP.run(msg);

    expect(res.isError).toBe(false);
    const result = res.result as any;
    expect(result.type).toBe("map");
    
    // Keys are stringified
    const keys = Object.keys(result.value);
    expect(keys.length).toBe(1);
    const firstKey = keys[0];
    if (firstKey === undefined) throw new Error("Key not found");
    expect(result.value[firstKey]).toEqual({ type: "integer", value: 1 });
  });
});
