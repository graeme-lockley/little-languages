import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { Constraints } from "./Constraints.ts";
import { inferPattern, inferProgram } from "./Infer.ts";
import { parse, Pattern } from "./Parser.ts";
import {
  emptyTypeEnv,
  Scheme,
  TArr,
  TVar,
  Type,
  typeBool,
  TypeEnv,
  typeInt,
} from "./Typing.ts";

const assertTypeEquals = (ts: Array<Type>, expected: Array<string>) => {
  assertEquals(ts.map((t) => t.toString()), expected);
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
      .extend(
        "a",
        new Scheme(new Set(["T"]), new TArr(new TVar("T"), new TVar("T"))),
      )
      .extend("b", new Scheme(new Set(), typeInt)),
    parse("a b"),
  );

  assertConstraintsEquals(constraints, [
    "V1 -> V1 ~ Int -> V2",
  ]);
  assertTypeEquals(type, ["V2"]);
});

Deno.test("infer If", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv
      .extend("a", new Scheme(new Set(["S"]), new TVar("S")))
      .extend("b", new Scheme(new Set(), typeInt))
      .extend("c", new Scheme(new Set(["T"]), new TVar("T"))),
    parse("if (a) b else c"),
  );

  assertConstraintsEquals(constraints, [
    "V1 ~ Bool",
    "Int ~ V2",
  ]);
  assertTypeEquals(type, ["Int"]);
});

Deno.test("infer Lam", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("\\x -> x 10"),
  );

  assertConstraintsEquals(constraints, [
    "V1 ~ Int -> V2",
  ]);
  assertTypeEquals(type, ["V1 -> V2"]);
});

Deno.test("infer Let", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("let x = 10 and y = x + 1 ; y"),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, ["(Int * Int)", "Int"]);
});

Deno.test("infer LBool", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("True"),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, ["Bool"]);
});

Deno.test("infer LInt", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("123"),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["Int"]);
});

Deno.test("infer LString", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse('"hello"'),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["String"]);
});

Deno.test("infer LTuple", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse('(1, "hello", True)'),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["(Int * String * Bool)"]);
});

Deno.test("infer LUnit", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("()"),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["()"]);
});

Deno.test("infer Match", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("match (1, 2) with (x, y) -> x + y"),
  );

  assertConstraintsEquals(constraints, [
    "V2 -> V3 -> V4 ~ Int -> Int -> Int",
    "(V2 * V3) ~ (Int * Int)",
    "V4 ~ V1",
  ]);
  assertTypeEquals(type, ["V1"]);
});

Deno.test("infer PBool pattern", () => {
  assertInferPattern(
    { type: "PBool", value: true },
    [],
    "Bool",
  );

  assertInferPattern(
    { type: "PBool", value: false },
    [],
    "Bool",
  );
});

Deno.test("infer PInt pattern", () => {
  assertInferPattern(
    { type: "PInt", value: 123 },
    [],
    "Int",
  );
});

Deno.test("infer PString pattern", () => {
  assertInferPattern(
    { type: "PString", value: "hello" },
    [],
    "String",
  );
});

Deno.test("infer PTuple pattern", () => {
  assertInferPattern(
    {
      type: "PTuple",
      values: [
        { type: "PBool", value: true },
        { type: "PInt", value: 123 },
        { type: "PString", value: "hello" },
        { type: "PUnit" },
      ],
    },
    [],
    "(Bool * Int * String * ())",
  );
});

Deno.test("infer PUnit pattern", () => {
  assertInferPattern(
    { type: "PUnit" },
    [],
    "()",
  );
});

Deno.test("infer PVar pattern", () => {
  assertInferPattern(
    { type: "PVar", name: "x" },
    [],
    "V1",
    emptyTypeEnv.extend("x", new Scheme(new Set(), new TVar("V1"))),
  );
});

Deno.test("infer PWildCard pattern", () => {
  assertInferPattern(
    { type: "PWildcard" },
    [],
    "V1",
  );
});

Deno.test("infer Op", () => {
  const scenario = (input: string, resultType: Type) => {
    const [constraints, type] = inferProgram(
      emptyTypeEnv
        .extend("a", new Scheme(new Set(["T"]), new TVar("T")))
        .extend("b", new Scheme(new Set(["T"]), new TVar("T"))),
      parse(input),
    );

    assertConstraintsEquals(constraints, [
      `V1 -> V2 -> V3 ~ Int -> Int -> ${resultType}`,
    ]);
    assertTypeEquals(type, ["V3"]);
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
      new Scheme(new Set(["T"]), new TArr(new TVar("T"), new TVar("T"))),
    ),
    parse("a"),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, ["V1 -> V1"]);
});

const assertInferPattern = (
  input: Pattern,
  expectedConstraints: Array<string>,
  expectedType: string,
  expectedTypeEnv: TypeEnv = emptyTypeEnv,
) => {
  const constraints = new Constraints();

  const [type, typeEnv] = inferPattern(emptyTypeEnv, input, constraints);

  assertConstraintsEquals(constraints, expectedConstraints);
  assertEquals(type.toString(), expectedType);
  assertEquals(typeEnv, expectedTypeEnv);
};
