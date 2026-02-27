type ParserSuccess<T> = {
  targetString: string;
  index: number;
  result: T;
  isError: false;
  error: null;
};

type ParserFailure = {
  targetString: string;
  index: number;
  result: null;
  isError: true;
  error: string;
};

type ParserState<T> = ParserSuccess<T> | ParserFailure;

type ParserStateTransformer<T> = (state: ParserState<any>) => ParserState<T>;

class Parser<T> {
  parserStateTransformerFn: ParserStateTransformer<T>;

  constructor(parserStateTransformerFn: ParserStateTransformer<T>) {
    this.parserStateTransformerFn = parserStateTransformerFn;
  }

  run(targetString: string): ParserState<T> {
    const initialState: ParserState<null> = {
      targetString,
      index: 0,
      result: null,
      isError: false,
      error: null,
    };

    return this.parserStateTransformerFn(initialState);
  }

  // modifiy the result
  map<U>(fn: (x: T) => U): Parser<U> {
    return new Parser<U>((state) => {
      const nextState = this.parserStateTransformerFn(state);
      if (nextState.isError) return nextState; // propagate failure
      return updateParserResult(nextState, fn(nextState.result));
    });
  }

  // modify the error
  errorMap(fn: (x: string, y: number) => string): Parser<T> {
    return new Parser<T>((state) => {
      const nextState = this.parserStateTransformerFn(state);
      if (!nextState.isError) return nextState;
      return updateParserError(nextState, fn(nextState.error, nextState.index));
    });
  }

  // modify the parser
  chain<U>(fn: (x: T) => Parser<U>): Parser<U> {
    return new Parser<U>((state) => {
      const nextState = this.parserStateTransformerFn(state);
      if (nextState.isError) return nextState;

      const nextParser = fn(nextState.result);
      return nextParser.parserStateTransformerFn(nextState);
    });
  }
}

const updateParserState = <T>(
  prevState: ParserState<any>,
  index: number,
  result: T,
): ParserSuccess<T> => {
  return {
    targetString: prevState.targetString,
    index,
    result,
    isError: false,
    error: null,
  };
};

const updateParserResult = <T>(
  prevState: ParserState<any>,
  result: T,
): ParserState<T> => {
  return {
    targetString: prevState.targetString,
    index: prevState.index,
    result,
    isError: false,
    error: null,
  };
};

const updateParserError = <T>(
  prevState: ParserState<T>,
  errorMsg: string,
): ParserFailure => {
  return {
    targetString: prevState.targetString,
    index: prevState.index,
    result: null,
    isError: true,
    error: errorMsg,
  };
};

const succeed = <T>(value: T): Parser<T> => {
  return new Parser((state) => {
    if (state.isError) return state;
    return updateParserResult(state, value);
  });
};

const fail = <T>(msg: string): Parser<T> => {
  return new Parser<T>(
    (state) => updateParserError(state, msg) as ParserState<T>,
  );
};

const literal = (s: string): Parser<string> => {
  return new Parser((state) => {
    if (state.isError) return state;

    const { targetString, index } = state;
    const slicedTarget = targetString.slice(index);

    if (slicedTarget.length === 0) {
      return updateParserError(
        state,
        `literal: Tried to match '${s}', but got end of input.`,
      );
    }

    if (slicedTarget.startsWith(s)) {
      return updateParserState(state, index + s.length, s);
    }

    return updateParserError(
      state,
      `literal: Tried to match '${s}', but got '${targetString.slice(index, 10)}...'`,
    );
  });
};

const noneOf = (s: string): Parser<string> => {
  return new Parser((state) => {
    if (state.isError) return state;

    const { targetString, index } = state;

    if (index >= targetString.length) {
      return updateParserError(state, `noneOf: Unexpected end of input`);
    }

    const c = targetString[index]!;
    if (!s.includes(c)) {
      return updateParserState(state, index + 1, c);
    }

    return updateParserError(state, `Unexpected character '${c}'`);
  });
};

const lettersRegex = /^[A-Za-z]+/;

const letters = new Parser((state) => {
  if (state.isError) return state;

  const { targetString, index } = state;
  const slicedTarget = targetString.slice(index);

  if (slicedTarget.length === 0) {
    return updateParserError(state, `letters: Got Unexpected end of input.`);
  }

  const regexMatch = slicedTarget.match(lettersRegex);

  if (regexMatch) {
    return updateParserState(
      state,
      index + regexMatch[0].length,
      regexMatch[0],
    );
  }

  return updateParserError(
    state,
    `letters: Couldn't match letters at index ${index}`,
  );
});

const digitsRegex = /^[0-9]+/;

const digits = new Parser((state) => {
  if (state.isError) return state;

  const { targetString, index } = state;
  const slicedTarget = targetString.slice(index);

  if (slicedTarget.length === 0) {
    return updateParserError(state, `digits: Got Unexpected end of input.`);
  }

  const regexMatch = slicedTarget.match(digitsRegex);

  if (regexMatch) {
    return updateParserState(
      state,
      index + regexMatch[0].length,
      regexMatch[0],
    );
  }

  return updateParserError(
    state,
    `digits: Couldn't match digits at index ${index}`,
  );
});

const all = <T extends any[]>(parsers: {
  [K in keyof T]: Parser<T[K]>;
}): Parser<T> => {
  return new Parser((state) => {
    if (state.isError) return state;

    let nextState: ParserState<any> = state;
    const results = [] as unknown as T;

    for (let parser of parsers) {
      nextState = parser.parserStateTransformerFn(nextState);
      if (nextState.isError) return nextState;
      results.push(nextState.result);
    }

    return updateParserResult(nextState, results);
  });
};

const any = <T>(parsers: Parser<T>[]): Parser<T> => {
  return new Parser((state) => {
    if (state.isError) return state;

    const originalState = state;

    for (let parser of parsers) {
      const nextState = parser.parserStateTransformerFn(state);
      if (!nextState.isError) return nextState;
    }

    return updateParserError(
      originalState,
      `any: Unable to match any parser at index ${state.index}`,
    );
  });
};

const maybe = <T>(parsers: Parser<T>[]): Parser<T | null> => {
  return new Parser((state) => {
    if (state.isError) return state;

    for (let parser of parsers) {
      const nextState = parser.parserStateTransformerFn(state);
      if (!nextState.isError) return nextState;
    }

    return updateParserResult(state, null);
  });
};

const many = <T>(parser: Parser<T>): Parser<T[]> => {
  return new Parser<T[]>((state) => {
    if (state.isError) return state;

    let nextState = state;
    const results = [];

    while (true) {
      const testState = parser.parserStateTransformerFn(nextState);
      if (testState.isError || testState.index === nextState.index) break;
      results.push(testState.result);
      nextState = testState;
    }

    return updateParserResult(nextState, results);
  });
};

const manyOne = <T>(parser: Parser<T>): Parser<T[]> => {
  return new Parser<T[]>((state) => {
    if (state.isError) return state;

    let nextState = state;
    const results = [];

    while (true) {
      const testState = parser.parserStateTransformerFn(nextState);
      if (testState.isError || testState.index === nextState.index) break;
      results.push(testState.result);
      nextState = testState;
    }

    if (results.length == 0) {
      return updateParserError(
        state,
        `manyOne: Unable to match any input using parser @${state.index}`,
      );
    }

    return updateParserResult(nextState, results);
  });
};

const manyN = <T>(n: number, p: Parser<T>): Parser<T[]> =>
  new Parser((state) => {
    let next = state;
    const out: T[] = [];

    for (let i = 0; i < n; i++) {
      const r = p.parserStateTransformerFn(next);
      if (r.isError) return r;
      out.push(r.result);
      next = r;
    }

    return updateParserResult(next, out);
  });

const sepBy =
  <SP>(seperatorParser: Parser<SP>) =>
  <VP>(valueParser: Parser<VP>) => {
    return new Parser((state) => {
      const results = [];

      let nextState = state;
      while (true) {
        const thingsWeWantState =
          valueParser.parserStateTransformerFn(nextState);
        if (thingsWeWantState.isError) break;
        results.push(thingsWeWantState.result);
        nextState = thingsWeWantState;

        const seperatorState =
          seperatorParser.parserStateTransformerFn(nextState);
        if (seperatorState.isError) break;
        nextState = seperatorState;
      }

      return updateParserResult(nextState, results);
    });
  };

const sepByOne =
  <SP>(seperatorParser: Parser<SP>) =>
  <VP>(valueParser: Parser<VP>) => {
    return new Parser((state) => {
      const results = [];

      let nextState = state;
      while (true) {
        const thingsWeWantState =
          valueParser.parserStateTransformerFn(nextState);
        if (thingsWeWantState.isError) break;
        results.push(thingsWeWantState.result);
        nextState = thingsWeWantState;

        const seperatorState =
          seperatorParser.parserStateTransformerFn(nextState);
        if (seperatorState.isError) break;
        nextState = seperatorState;
      }

      if (results.length === 0) {
        return updateParserError(
          state,
          `sepByOne: Unable to capture any results at index ${state.index}`,
        );
      }

      return updateParserResult(nextState, results);
    });
  };

const between =
  <L, R>(leftParser: Parser<L>, rightParser: Parser<R>) =>
  <C>(contentParser: Parser<C>) => {
    return all([leftParser, contentParser, rightParser]).map(
      (resluts) => resluts[1],
    );
  };

const take = (n: number): Parser<string> => {
  return new Parser((state) => {
    if (state.isError) return state;

    const { targetString, index } = state;

    const remaining = targetString.length - index;

    if (remaining < n) {
      return updateParserError(
        state,
        `take: Expected ${n} chars but only ${remaining} available`,
      );
    }

    const slice = targetString.slice(index, index + n);

    return updateParserState(state, index + n, slice);
  });
};

const lazy = <T>(parserThunk: () => Parser<T>) =>
  new Parser((state) => {
    const parser = parserThunk();
    return parser.parserStateTransformerFn(state);
  });

export {
  Parser,
  literal,
  noneOf,
  letters,
  digits,
  all,
  any,
  maybe,
  many,
  manyOne,
  manyN,
  sepBy,
  sepByOne,
  between,
  take,
  lazy,
  updateParserError,
  updateParserResult,
  updateParserState,
  succeed,
  fail,
};
