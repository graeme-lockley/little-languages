import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { inferExpression } from "./Infer.ts";
import { parse } from "./Parser.ts";
import {
  emptyTypeEnv,
  Scheme,
  TArr,
  TCon,
  TVar,
  Type,
  typeBool,
  typeInt,
} from "./Typing.ts";

Deno.test("infer Apply", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv
      .extend("a", new Scheme(["T"], new TArr(new TVar("T"), new TVar("T"))))
      .extend("b", new Scheme([], typeInt)),
    parse("a b").expr,
  );

  assertEquals(constraints.constraints.length, 1);
  assertEquals(constraints.constraints[0], [
    new TArr(new TVar("V1"), new TVar("V1")),
    new TArr(new TCon("Int"), new TVar("V2")),
  ]);
  assertEquals(type, new TVar("V2"));
});

Deno.test("infer If", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv
      .extend("a", new Scheme(["S"], new TVar("S")))
      .extend("b", new Scheme([], typeInt))
      .extend("c", new Scheme(["T"], new TVar("T"))),
    parse("if (a) b else c").expr,
  );

  assertEquals(constraints.constraints.length, 2);
  assertEquals(constraints.constraints[0], [new TVar("V1"), typeBool]);
  assertEquals(constraints.constraints[1], [typeInt, new TVar("V2")]);
  assertEquals(type, typeInt);
});

Deno.test("infer LBool", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("True").expr,
  );

  assertEquals(constraints.constraints.length, 0);
  assertEquals(type, typeBool);
});

Deno.test("infer Lam", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("\\x -> x 10").expr,
  );

  assertEquals(constraints.constraints.length, 1);
  assertEquals(constraints.constraints[0], [
    new TVar("V1"),
    new TArr(typeInt, new TVar("V2")),
  ]);
  assertEquals(type, new TArr(new TVar("V1"), new TVar("V2")));
});

Deno.test("infer Let", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("let x = 10 in x").expr,
  );

  assertEquals(constraints.constraints.length, 0);
  assertEquals(type, typeInt);
});

Deno.test("infer LInt", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("123").expr,
  );

  assertEquals(constraints.constraints.length, 0);
  assertEquals(type, typeInt);
});

Deno.test("infer Op", () => {
  const scenario = (input: string, resultType: Type) => {
    const [constraints, type] = inferExpression(
      emptyTypeEnv
        .extend("a", new Scheme(["T"], new TVar("T")))
        .extend("b", new Scheme(["T"], new TVar("T"))),
      parse(input).expr,
    );
    assertEquals(constraints.constraints.length, 1);

    assertEquals(
      constraints.constraints[0],
      [
        new TArr(new TVar("V1"), new TArr(new TVar("V2"), new TVar("V3"))),
        new TArr(typeInt, new TArr(typeInt, resultType)),
      ],
    );
    assertEquals(type, new TVar("V3"));
  };

  scenario("a + b", typeInt);
  scenario("a - b", typeInt);
  scenario("a * b", typeInt);
  scenario("a / b", typeInt);
  scenario("a == b", typeBool);
});

Deno.test("infer Var", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv.extend(
      "a",
      new Scheme(["T"], new TArr(new TVar("T"), new TVar("T"))),
    ),
    parse("a").expr,
  );

  assertEquals(constraints.constraints.length, 0);
  assertEquals(type, new TArr(new TVar("V1"), new TVar("V1")));
});
