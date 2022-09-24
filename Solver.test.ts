import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { inferExpression } from "./Infer.ts";
import { parse } from "./Parser.ts";
import { solver } from "./Solver.ts";
import { emptyTypeEnv, TArr, TVar, typeInt } from "./Typing.ts";

Deno.test("solve \\x -> \\y -> \\z -> x + y + z", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("\\x -> \\y -> \\z -> x + y + z").expr,
  );

  const subst = solver(constraints.constraints);

  assertEquals(
    type.apply(subst),
    new TArr(typeInt, new TArr(typeInt, new TArr(typeInt, typeInt))),
  );
});

Deno.test("solve \\f -> \\g -> \\x -> f (g x)", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("\\f -> \\g -> \\x -> f (g x)").expr,
  );

  const subst = solver(constraints.constraints);

  assertEquals(
    type.apply(subst),
    new TArr(
      new TArr(new TVar("V4"), new TVar("V5")),
      new TArr(
        new TArr(new TVar("V3"), new TVar("V4")),
        new TArr(new TVar("V3"), new TVar("V5")),
      ),
    ),
  );
});

Deno.test("solve let f = (\\x -> x) in let g = (f True) in f 3", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("let f = (\\x -> x) in let g = (f True) in f 3").expr,
  );

  const subst = solver(constraints.constraints);

  assertEquals(
    type.apply(subst),
    typeInt,
  );
});

Deno.test("solve let identity = \\n -> n in identity", () => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    parse("let identity = \\n -> n in identity").expr,
  );

  const subst = solver(constraints.constraints);

    assertEquals(
      type.apply(subst),
      new TArr(new TVar("V2"), new TVar("V2")),
    );
});

Deno.test("solve let compose = \\f -> \\g -> \\x -> f (g x) in compose", () => {
  const [constraints, _type] = inferExpression(
    emptyTypeEnv,
    parse("let compose = \\f -> \\g -> \\x -> f (g x) in compose").expr,
  );

  // console.log(JSON.stringify(constraints.constraints, null, 2));
  // console.log(type);

  const _subst = solver(constraints.constraints);

  //   console.log(subst);
  // console.log(type.apply(subst));

  //   assertEquals(
  //     type.apply(subst),
  //     new TArr(typeInt, new TArr(typeInt, new TArr(typeInt, typeInt))),
  //   );
});
