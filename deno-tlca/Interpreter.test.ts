import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";

import { execute } from "./Interpreter.ts";
import { TArr } from "./Typing.ts";

Deno.test("App 1", () => {
  assertExecute("(\\n -> n + 1) 1", ["2: Int"]);
});

Deno.test("App", () => {
  assertExecute("(\\a -> \\b -> a + b) 10 20", ["30: Int"]);
});

Deno.test("If", () => {
  assertExecute("if (True) 1 else 2", ["1: Int"]);
  assertExecute("if (False) 1 else 2", ["2: Int"]);
});

Deno.test("Lam", () => {
  assertExecute("\\a -> \\b -> a + b", ["function: Int -> Int -> Int"]);
});

Deno.test("Let", () => {
  assertExecute("let add a b = a + b and incr = add 1 ; incr 10", [
    "null: ()",
    "11: Int",
  ]);
});

Deno.test("LetRec", () => {
  assertExecute(
    "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) ; fact",
    ["null: ()", "function: Int -> Int"],
  );
  assertExecute(
    "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) ; fact 5",
    ["null: ()", "120: Int"],
  );

  assertExecute(
    "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isEven 5",
    ["null: ()", "false: Bool"],
  );
  assertExecute(
    "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isOdd 5",
    ["null: ()", "true: Bool"],
  );
});

Deno.test("LInt", () => {
  assertExecute("123", ["123: Int"]);
});

Deno.test("LBool", () => {
  assertExecute("True", ["true: Bool"]);
  assertExecute("False", ["false: Bool"]);
});

Deno.test("Op", () => {
  assertExecute("1 == 2", ["false: Bool"]);
  assertExecute("2 == 2", ["true: Bool"]);

  assertExecute("3 + 2", ["5: Int"]);
  assertExecute("3 - 2", ["1: Int"]);
  assertExecute("3 * 2", ["6: Int"]);
  assertExecute("9 / 2", ["4: Int"]);
});

Deno.test("Var", () => {
  assertExecute("let x = 1 ; x", ["null: ()", "1: Int"]);
  assertExecute("let x = True ; x", ["null: ()", "true: Bool"]);
  assertExecute("let x = \\a -> a ; x", ["null: ()", "function: V2 -> V2"]);
});

const assertExecute = (expression: string, expected: Array<string>) => {
  const result = execute(expression)[0].map(([value, type]) => {
    if (type instanceof TArr) {
      return `function: ${type}`;
    } else {
      return `${value}: ${type}`;
    }
  });

  assertEquals(result, expected);
};
