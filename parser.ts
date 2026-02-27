import {
  Parser,
  literal,
  noneOf,
  digits,
  all,
  any,
  maybe,
  many,
  manyN,
  between,
  take,
  lazy,
  succeed,
  fail,
} from "./engine";

export type Resp =
  | { type: "simple_string"; value: string }
  | { type: "simple_error"; value: string }
  | { type: "integer"; value: number }
  | { type: "bulk_string"; value: string | null }
  | { type: "bulk_error"; value: string }
  | { type: "verbatim"; value: string }
  | { type: "null"; value: null }
  | { type: "boolean"; value: boolean }
  | { type: "double"; value: number }
  | { type: "bignumber"; value: string }
  | { type: "array"; value: Resp[] | null }
  | { type: "map"; value: Record<string, Resp> }
  | { type: "set"; value: Resp[] }
  | { type: "attribute"; value: Resp[] }
  | { type: "push"; value: Resp[] };

export const RESP: Parser<Resp> = lazy(() =>
  any<Resp>([
    simpleStringResp,
    simpleErrorResp,
    integerResp,
    bulkStringResp,
    bulkErrorResp,
    verbatimResp,
    nullResp,
    booleanResp,
    doubleResp,
    bigNumberResp,
    arrayResp,
    mapResp,
    setResp,
    attributeResp,
    pushResp,
  ]),
);

const CRLF = literal("\r\n");

const signedInt = all([maybe([literal("-"), literal("+")]), digits]).map(
  ([s, n]) => Number((s ?? "") + n),
);

const simpleStringResp: Parser<Resp> = between(
  literal("+"),
  CRLF,
)(many(noneOf("\r\n")))
  .map((v) => v.join(""))
  .map((v) => ({
    type: "simple_string",
    value: v,
  }));

const simpleErrorResp: Parser<Resp> = between(
  literal("-"),
  CRLF,
)(many(noneOf("\r\n")))
  .map((v) => v.join(""))
  .map((v) => ({
    type: "simple_error",
    value: v,
  }));

const integerResp: Parser<Resp> = between(
  literal(":"),
  CRLF,
)(signedInt).map((v) => ({
  type: "integer",
  value: v,
}));

const bulkStringResp: Parser<Resp> = between(
  literal("$"),
  CRLF,
)(signedInt)
  .chain<string | null>((len): Parser<string | null> => {
    if (len === -1) return succeed<string | null>(null);
    if (len < 0) return fail<string | null>("invalid bulk length");

    return all([take(len), CRLF]).map(([v]) => v);
  })
  .map((v) => ({
    type: "bulk_string",
    value: v,
  }));

const bulkErrorResp: Parser<Resp> = between(
  literal("!"),
  CRLF,
)(signedInt).chain<Resp>((len): Parser<Resp> => {
  if (len < 0) return fail<Resp>("invalid bulk error length");

  return all([take(len), CRLF]).map(([v]) => ({
    type: "bulk_error",
    value: v,
  }));
});

const verbatimResp: Parser<Resp> = between(
  literal("="),
  CRLF,
)(signedInt).chain<Resp>((len): Parser<Resp> => {
  if (len < 0) return fail<Resp>("invalid verbatim length");

  return all([take(len), CRLF]).map(([v]) => ({
    type: "verbatim",
    value: v,
  }));
});

const nullResp: Parser<Resp> = all([literal("_"), CRLF]).map(() => ({
  type: "null",
  value: null,
}));

const booleanResp: Parser<Resp> = all([
  literal("#"),
  any([literal("t"), literal("f")]),
  CRLF,
]).map((res) => ({
  type: "boolean",
  value: res[1] === "t",
}));

const doubleResp: Parser<Resp> = between(
  literal(","),
  CRLF,
)(many(noneOf("\r\n"))).map((v) => {
  const s = v.join("");
  if (s === "inf") return { type: "double", value: Infinity };
  if (s === "-inf") return { type: "double", value: -Infinity };
  if (s === "nan") return { type: "double", value: NaN };
  return { type: "double", value: Number(s) };
});

const bigNumberResp: Parser<Resp> = between(
  literal("("),
  CRLF,
)(many(noneOf("\r\n"))).map((v) => ({
  type: "bignumber",
  value: v.join(""),
}));

const arrayResp: Parser<Resp> = between(
  literal("*"),
  CRLF,
)(signedInt).chain<Resp>((len): Parser<Resp> => {
  if (len === -1) return succeed<Resp>({ type: "array", value: null });
  if (len < 0) return fail<Resp>("invalid array length");

  return manyN(len, RESP).map((v) => ({ type: "array", value: v }));
});

const mapResp: Parser<Resp> = between(
  literal("%"),
  CRLF,
)(signedInt).chain<Resp>((len): Parser<Resp> => {
  if (len < 0) return fail<Resp>("invalid map length");

  return manyN(len * 2, RESP).map((entries) => {
    const obj: Record<string, Resp> = {};
    for (let i = 0; i < entries.length; i += 2)
      obj[JSON.stringify(entries[i]!)] = entries[i + 1]!;
    return { type: "map", value: obj };
  });
});

const setResp: Parser<Resp> = between(
  literal("~"),
  CRLF,
)(signedInt).chain<Resp>((len): Parser<Resp> => {
  if (len < 0) return fail<Resp>("invalid set length");

  return manyN(len, RESP).map((v) => ({ type: "set", value: v }));
});

const attributeResp: Parser<Resp> = between(
  literal("|"),
  CRLF,
)(signedInt).chain<Resp>((len): Parser<Resp> => {
  if (len < 0) return fail<Resp>("invalid attribute length");

  return manyN(len * 2, RESP).map((v) => ({ type: "attribute", value: v }));
});

const pushResp: Parser<Resp> = between(
  literal(">"),
  CRLF,
)(signedInt).chain<Resp>((len): Parser<Resp> => {
  if (len < 0) return fail<Resp>("invalid push length");

  return manyN(len, RESP).map((v) => ({ type: "push", value: v }));
});
