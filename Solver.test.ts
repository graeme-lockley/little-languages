import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { inferExpression } from "./Infer.ts";
import { parse } from "./Parser.ts";
import { solver } from "./Solver.ts";
import { emptyTypeEnv, TArr, TVar, Type, typeBool, typeInt } from "./Typing.ts";

const solve = (expression: string): Type => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse(expression),
  );

  const subst = solver(constraints.constraints);

  return type.apply(subst);
};

const assertType = (expression: string, expected: Type) => {
  assertEquals(
    solve(expression),
    expected,
  );
};

Deno.test("solve \\x -> \\y -> \\z -> x + y + z", () => {
  assertType(
    "\\x -> \\y -> \\z -> x + y + z",
    new TArr(typeInt, new TArr(typeInt, new TArr(typeInt, typeInt))),
  );
});

Deno.test("solve \\f -> \\g -> \\x -> f (g x)", () => {
  assertType(
    "\\f -> \\g -> \\x -> f (g x)",
    new TArr(
      new TArr(new TVar("V4"), new TVar("V5")),
      new TArr(
        new TArr(new TVar("V3"), new TVar("V4")),
        new TArr(new TVar("V3"), new TVar("V5")),
      ),
    ),
  );
});

Deno.test("solve let compose = \\f -> \\g -> \\x -> f (g x) in compose", () => {
  assertType(
    "let compose = \\f -> \\g -> \\x -> f (g x) in compose",
    new TArr(
      new TArr(new TVar("V6"), new TVar("V7")),
      new TArr(
        new TArr(new TVar("V8"), new TVar("V6")),
        new TArr(new TVar("V8"), new TVar("V7")),
      ),
    ),
  );
});

Deno.test("solve let f = (\\x -> x) in let g = (f True) in f 3", () => {
  assertType(
    "let f = (\\x -> x) in let g = (f True) in f 3",
    typeInt,
  );
});

Deno.test("solve let identity = \\n -> n in identity", () => {
  assertType(
    "let identity = \\n -> n in identity",
    new TArr(new TVar("V2"), new TVar("V2")),
  );
});

Deno.test("solve let add a b = a + b; succ = add 1 in succ 10", () => {
  assertType(
    "let add a b = a + b; succ = add 1 in succ 10",
    typeInt,
  );
});

Deno.test("solve let rec fact n = if (n == 0) 1 else fact (n - 1) * n in fact", () => {
  assertType(
    "let rec fact n = if (n == 0) 1 else fact(n - 1) * n in fact",
    new TArr(typeInt, typeInt),
  );
});

Deno.test("solve let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd", () => {
  assertType(
    "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd",
    new TArr(typeInt, typeBool),
  );
});

Deno.test("solve let rec a = b + 1; b = a + 1 in a", () => {
  assertType(
    "let rec a = b + 1; b = a + 1 in a",
    typeInt,
  );
});
