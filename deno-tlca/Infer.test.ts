import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { Constraints } from "./Constraints.ts";
import { inferProgram } from "./Infer.ts";
import { parse } from "./Parser.ts";
import {
  emptyTypeEnv,
  Scheme,
  TArr,
  TVar,
  Type,
  typeBool,
  typeInt,
} from "./Typing.ts";

const assertTypeEquals = (t: Type, expected: string) => {
  assertEquals(t.toString(), expected);
};

const assertConstraintsEquals = (
  constraints: Constraints,
  expected: Array<string>,
) => {
  assertEquals(constraints.toString(), expected.join(", "));
};

Deno.test("infer Apply", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv
      .extend("a", new Scheme(["T"], new TArr(new TVar("T"), new TVar("T"))))
      .extend("b", new Scheme([], typeInt)),
    parse("a b"),
  );

  assertConstraintsEquals(constraints, [
    "V1 -> V1 ~ Int -> V2",
  ]);
  assertTypeEquals(type, "V2");
});

Deno.test("infer If", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv
      .extend("a", new Scheme(["S"], new TVar("S")))
      .extend("b", new Scheme([], typeInt))
      .extend("c", new Scheme(["T"], new TVar("T"))),
    parse("if (a) b else c"),
  );

  assertConstraintsEquals(constraints, [
    "V1 ~ Bool",
    "Int ~ V2",
  ]);
  assertTypeEquals(type, "Int");
});

Deno.test("infer LBool", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("True"),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, "Bool");
});

Deno.test("infer Lam", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("\\x -> x 10"),
  );

  assertConstraintsEquals(constraints, [
    "V1 ~ Int -> V2",
  ]);
  assertTypeEquals(type, "V1 -> V2");
});

Deno.test("infer Let", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("let x = 10 and y = x + 1 ; y"),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, "Int");
});

Deno.test("infer LInt", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("123"),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, "Int");
});

Deno.test("infer Op", () => {
  const scenario = (input: string, resultType: Type) => {
    const [constraints, type] = inferProgram(
      emptyTypeEnv
        .extend("a", new Scheme(["T"], new TVar("T")))
        .extend("b", new Scheme(["T"], new TVar("T"))),
      parse(input),
    );

    assertConstraintsEquals(constraints, [
      `V1 -> V2 -> V3 ~ Int -> Int -> ${resultType}`,
    ]);
    assertTypeEquals(type, "V3");
  };

  scenario("a + b", typeInt);
  scenario("a - b", typeInt);
  scenario("a * b", typeInt);
  scenario("a / b", typeInt);
  scenario("a == b", typeBool);
});

Deno.test("infer Var", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv.extend(
      "a",
      new Scheme(["T"], new TArr(new TVar("T"), new TVar("T"))),
    ),
    parse("a"),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, "V1 -> V1");
});
