// deno-lint-ignore-file no-explicit-any
import { inferExpression } from "./Infer.ts";
import { Expression, Op, parse } from "./Parser.ts";
import { emptyTypeEnv, Type } from "./Typing.ts";

const solve = (expression: Expression): Type => {
  const [constraints, type] = inferExpression(
    emptyTypeEnv,
    expression,
  );

  const subst = constraints.solve();

  return type.apply(subst);
};

const binaryOps = new Map<number, (v1: any, v2: any) => any>([
  [Op.Equals, (a, b) => a === b],
  [Op.Plus, (a, b) => (a + b) | 0],
  [Op.Minus, (a, b) => (a - b) | 0],
  [Op.Times, (a, b) => (a * b) | 0],
  [Op.Divide, (a, b) => (a / b) | 0],
]);

const evaluate = (expr: Expression, env: any): any => {
  if (expr.type === "App") {
    return evaluate(expr.e1, env)(evaluate(expr.e2, env));
  }
  if (expr.type === "If") {
    return evaluate(expr.guard, env)
      ? evaluate(expr.then, env)
      : evaluate(expr.else, env);
  }
  if (expr.type === "Lam") {
    return (x: any) => {
      const newEnv = { ...env };
      newEnv[expr.name] = x;
      return evaluate(expr.expr, newEnv);
    };
  }
  if (expr.type === "Let" || expr.type === "LetRec") {
    const newEnv = { ...env };
    expr.declarations.forEach((d) => {
      newEnv[d.name] = evaluate(d.expr, newEnv);
    });
    return evaluate(expr.expr, newEnv);
  }
  if (expr.type === "LBool") {
    return expr.value;
  }
  if (expr.type === "LInt") {
    return expr.value;
  }
  if (expr.type === "LTuple") {
    return expr.values.map((v) => evaluate(v, env));
  }
  if (expr.type === "Op") {
    return binaryOps.get(expr.op)!(
      evaluate(expr.left, env),
      evaluate(expr.right, env),
    );
  }
  if (expr.type === "Var") {
    return env[expr.name];
  }
};

export const execute = (t: string): [any, Type] => {
  const ast = parse(t);

  return [evaluate(ast, {}), solve(ast)];
};

// [
//   "123",
//   "True",
//   "False",
//   "1 == 2",
//   "2 == 2",
//   "3 + 2",
//   "3 - 2",
//   "3 * 2",
//   "3 / 2",
//   "if (True) 1 else 2",
//   "if (False) 1 else 2",
//   "\\a -> \\b -> a + b",
//   "(\\a -> \\b -> a + b) 10 20",
//   "let add a b = a + b ; incr = add 1 in incr 10",
//   "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact",
//   "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact 5",
//   "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd 5",
//   "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isEven 5",
// ].forEach((t: string) => {
//   console.log(t);

//   const [v, type] = execute(t);

//   if (type instanceof TArr) {
//     console.log(`> function: ${type}`);
//   } else {
//     console.log(`> ${v}: ${type}`);
//   }
// });
