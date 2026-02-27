import type { Resp } from "./parser";

// Converts a parsed Resp object into a native TypeScript/JavaScript value.
export function decode(resp: Resp): any {
  switch (resp.type) {
    case "simple_string":
    case "integer":
    case "bulk_string":
    case "boolean":
    case "double":
    case "bignumber":
    case "verbatim":
      return resp.value;

    case "simple_error":
    case "bulk_error":
      // Returning an Error object for errors
      return new Error(resp.value);

    case "null":
      return null;

    case "array":
    case "set":
    case "push":
      return resp.value === null ? null : resp.value.map(decode);

    case "attribute":
      // Attributes are usually metadata, for now we return them as an array of unmarshaled values
      return resp.value.map(decode);

    case "map":
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(resp.value)) {
        let unmarshaledKey: string = key;
        try {
          // The parser stores keys as JSON.stringify(Resp AST node)
          const keyResp = JSON.parse(key) as Resp;
          const nativeKey = decode(keyResp);
          unmarshaledKey =
            typeof nativeKey === "string"
              ? nativeKey
              : JSON.stringify(nativeKey);
        } catch (e) {
          // If it's not JSON, use the key as is
        }
        result[unmarshaledKey] = decode(value);
      }
      return result;

    default:
      return null;
  }
}

// Converts a native TypeScript/JavaScript value into its RESP wire format string.
export function encode(val: any): string {
  if (val === null || val === undefined) {
    return "_\r\n";
  }

  if (typeof val === "boolean") {
    return `#${val ? "t" : "f"}\r\n`;
  }

  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return `:${val}\r\n`;
    }
    if (Object.is(val, Infinity)) return ",inf\r\n";
    if (Object.is(val, -Infinity)) return ",-inf\r\n";
    if (Object.is(val, NaN)) return ",nan\r\n";
    return `,${val}\r\n`;
  }

  if (typeof val === "string") {
    // use bulk string for general strings to be safe
    return `$${Buffer.byteLength(val)}\r\n${val}\r\n`;
  }

  if (Array.isArray(val)) {
    let res = `*${val.length}\r\n`;
    for (const item of val) {
      res += encode(item);
    }
    return res;
  }

  if (val instanceof Set) {
    const items = Array.from(val);
    let res = `~${items.length}\r\n`;
    for (const item of items) {
      res += encode(item);
    }
    return res;
  }

  if (val instanceof Error) {
    return `-${val.message}\r\n`;
  }

  if (typeof val === "object") {
    const entries = Object.entries(val);
    let res = `%${entries.length}\r\n`;
    for (const [k, v] of entries) {
      res += encode(k);
      res += encode(v);
    }
    return res;
  }

  return "";
}

// Helper to marshal a Redis command array to RESP bulk strings.
export function encodeCommand(args: string[]): string {
  let res = `*${args.length}\r\n`;
  for (const arg of args) {
    res += `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`;
  }
  return res;
}
