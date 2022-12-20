import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";

import { execute } from "./Interpreter.ts";
import { TArr } from "./Typing.ts";

Deno.test("App", () => {
  assertExecute("(\\a -> \\b -> a + b) 10 20", "30: Int");
});

Deno.test("If", () => {
  assertExecute("if (True) 1 else 2", "1: Int");
  assertExecute("if (False) 1 else 2", "2: Int");
});

Deno.test("Lam", () => {
  assertExecute("\\a -> \\b -> a + b", "function: Int -> Int -> Int");
});

Deno.test("Let", () => {
  assertExecute("let add a b = a + b ; incr = add 1 in incr 10", "11: Int");
});

Deno.test("LetRec", () => {
  assertExecute(
    "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact",
    "function: Int -> Int",
  );
  assertExecute(
    "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact 5",
    "120: Int",
  );

  assertExecute(
    "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isEven 5",
    "false: Bool",
  );
  assertExecute(
    "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd 5",
    "true: Bool",
  );
});

Deno.test("LInt", () => {
  assertExecute("123", "123: Int");
});

Deno.test("LBool", () => {
  assertExecute("True", "true: Bool");
  assertExecute("False", "false: Bool");
});

Deno.test("Op", () => {
  assertExecute("1 == 2", "false: Bool");
  assertExecute("2 == 2", "true: Bool");

  assertExecute("3 + 2", "5: Int");
  assertExecute("3 - 2", "1: Int");
  assertExecute("3 * 2", "6: Int");
  assertExecute("9 / 2", "4: Int");
});

Deno.test("Var", () => {
  assertExecute("let x = 1 in x", "1: Int");
  assertExecute("let x = True in x", "true: Bool");
  assertExecute("let x = \\a -> a in x", "function: V2 -> V2");
});

Deno.test("Arb", () => {
  assertExecute(
    "let x n = let ss b = if (b == n) 1 else 2 in ss 5 in x",
    "function: Int -> Int",
  );
});

const assertExecute = (expression: string, expected: string) => {
  const [value, type] = execute(expression);

  if (type instanceof TArr) {
    assertEquals(
      expected,
      `function: ${type}`,
    );
  } else {
    assertEquals(
      expected,
      `${value}: ${type}`,
    );
  }
};
