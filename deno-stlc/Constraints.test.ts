import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { Constraints } from "./Constraints.ts";
import { inferExpression } from "./Infer.ts";
import { parse } from "./Parser.ts";
import { createFresh, emptyTypeEnv, Type } from "./Typing.ts";

const solve = (expression: string): Type => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse(expression),
    new Constraints(),
    createFresh(),
  );

  const subst = constraints.solve();

  return type.apply(subst);
};

const assertType = (expression: string, expected: string) => {
  assertEquals(
    expected,
    solve(expression).toString(),
  );
};

Deno.test("solve \\x -> \\y -> \\z -> x + y + z", () => {
  assertType(
    "\\x -> \\y -> \\z -> x + y + z",
    "Int -> Int -> Int -> Int",
  );
});

Deno.test("solve \\f -> \\g -> \\x -> f (g x)", () => {
  assertType(
    "\\f -> \\g -> \\x -> f (g x)",
    "(V4 -> V5) -> (V3 -> V4) -> V3 -> V5",
  );
});

Deno.test("solve let rec? compose = \\f -> \\g -> \\x -> f (g x) in compose", () => {
  assertType(
    "let compose = \\f -> \\g -> \\x -> f (g x) in compose",
    "(V6 -> V7) -> (V8 -> V6) -> V8 -> V7",
  );

  assertType(
    "let rec compose = \\f -> \\g -> \\x -> f (g x) in compose",
    "(V9 -> V10) -> (V11 -> V9) -> V11 -> V10",
  );
});

Deno.test("solve let rec? f = (\\x -> x) in let rec? g = (f True) in f 3", () => {
  assertType(
    "let f = (\\x -> x) in let g = (f True) in f 3",
    "Int",
  );

  assertType(
    "let f = (\\x -> x) in let rec g = (f True) in f 3",
    "Int",
  );

  assertType(
    "let rec f = (\\x -> x) in let g = (f True) in f 3",
    "Int",
  );

  assertType(
    "let rec f = (\\x -> x) in let rec g = (f True) in f 3",
    "Int",
  );
});

Deno.test("solve let rec? identity = \\n -> n in identity", () => {
  assertType(
    "let identity = \\n -> n in identity",
    "V2 -> V2",
  );

  assertType(
    "let rec identity = \\n -> n in identity",
    "V5 -> V5",
  );
});

Deno.test("solve let rec? add a b = a + b; succ = add 1 in succ 10", () => {
  assertType(
    "let add a b = a + b; succ = add 1 in succ 10",
    "Int",
  );

  assertType(
    "let rec add a b = a + b; succ = add 1 in succ 10",
    "Int",
  );
});

Deno.test("solve let rec fact n = if (n == 0) 1 else fact (n - 1) * n in fact", () => {
  assertType(
    "let rec fact n = if (n == 0) 1 else fact(n - 1) * n in fact",
    "Int -> Int",
  );
});

Deno.test("solve let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd", () => {
  assertType(
    "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd",
    "Int -> Bool",
  );
});

Deno.test("solve let rec a = b + 1; b = a + 1 in a", () => {
  assertType(
    "let rec a = b + 1; b = a + 1 in a",
    "Int",
  );
});

Deno.test("solve let rec? identity a = a; v = identity 10 in v", () => {
  assertType(
    "let identity a = a; v = identity 10 in v",
    "Int",
  );

  assertType(
    "let rec identity a = a; v = identity 10 in v",
    "Int",
  );
});

Deno.test("solve let rec? identity a = a in let rec? v1 = identity 10; v2 = identity True in v?", () => {
  assertType(
    "let identity a = a in let rec v1 = identity 10; v2 = identity True in v1",
    "Int",
  );

  assertType(
    "let rec identity a = a in let rec v1 = identity 10; v2 = identity True in v1",
    "Int",
  );

  assertType(
    "let identity a = a in let rec v1 = identity 10; v2 = identity True in v2",
    "Bool",
  );

  assertType(
    "let rec identity a = a in let rec v1 = identity 10; v2 = identity True in v2",
    "Bool",
  );
});
