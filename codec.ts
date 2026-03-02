import type { Resp } from "./parser";

// Converts a parsed Resp object into a native TypeScript/JavaScript value.
export function decode(resp: Resp): any {
  switch (resp.type) {
    case "simple_string":
    case "bulk_string":
    case "simple_error":
    case "bulk_error":
    case "verbatim":
      if (resp.value === null) return null;
      return Buffer.from(resp.value, "latin1").toString("utf8");

    case "integer":
    case "boolean":
    case "double":
    case "bignumber":
      return resp.value;

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
    const latin1Val = Buffer.from(val, "utf8").toString("latin1");
    // Since latin1 has 1 char = 1 byte, latin1Val.length is the byte length.
    return `$${latin1Val.length}\r\n${latin1Val}\r\n`;
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
    const message = Buffer.from(val.message, "utf8").toString("latin1");
    return `-${message}\r\n`;
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

export function encodeCommand(args: string[]): string {
  let res = `*${args.length}\r\n`;
  for (const arg of args) {
    const latin1Arg = Buffer.from(arg, "utf8").toString("latin1");
    res += `$${latin1Arg.length}\r\n${latin1Arg}\r\n`;
  }
  return res;
}
