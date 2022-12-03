// deno-lint-ignore-file no-explicit-any
import { Constraints } from "./Constraints.ts";
import { inferExpression } from "./Infer.ts";
import { Expression, Op, parse, Program } from "./Parser.ts";
import { createFresh, emptyTypeEnv, Type, TypeEnv } from "./Typing.ts";

const binaryOps = new Map<number, (v1: any, v2: any) => any>([
  [Op.Equals, (a, b) => a === b],
  [Op.Plus, (a, b) => (a + b) | 0],
  [Op.Minus, (a, b) => (a - b) | 0],
  [Op.Times, (a, b) => (a * b) | 0],
  [Op.Divide, (a, b) => (a / b) | 0],
]);

const evaluate = (expr: Expression, env: any): [any, any] => {
  if (expr.type === "App") {
    const operator = evaluate(expr.e1, env)[0];
    const operand = evaluate(expr.e2, env)[0];
    const result = operator(operand)[0];

    return [result, env];
  }
  if (expr.type === "If") {
    return evaluate(expr.guard, env)[0]
      ? [evaluate(expr.then, env)[0], env]
      : [evaluate(expr.else, env)[0], env];
  }
  if (expr.type === "Lam") {
    return [(x: any): [any, any] => {
      const newEnv = { ...env };
      newEnv[expr.name] = x;
      return [evaluate(expr.expr, newEnv)[0], env];
    }, env];
  }
  if (expr.type === "Let" || expr.type === "LetRec") {
    const newEnv = { ...env };
    expr.declarations.forEach((d) => {
      newEnv[d.name] = evaluate(d.expr, newEnv)[0];
    });
    return [null, newEnv];
  }
  if (expr.type === "LBool") {
    return [expr.value, env];
  }
  if (expr.type === "LInt") {
    return [expr.value, env];
  }
  if (expr.type === "LTuple") {
    return [expr.values.map((v) => evaluate(v, env)[0]), env];
  }
  if (expr.type === "Op") {
    const left = evaluate(expr.left, env)[0];
    const right = evaluate(expr.right, env)[0];
    return [binaryOps.get(expr.op)!(left, right), env];
  }
  if (expr.type === "Var") {
    return [env[expr.name], env];
  }

  return [null, env];
};

export type Env = [any, TypeEnv];

export const mkEnv = (
  runtime: any,
  typeEnv: TypeEnv,
): Env => [runtime, typeEnv];

export const runtime = (env: Env): any => env[0];
export const typeEnv = (env: Env): TypeEnv => env[1];

const executeProgram = (
  program: Program,
  env: Env,
): [Array<[any, Type]>, Env] => {
  const results: Array<[any, Type]> = [];
  const pump = createFresh();

  program.forEach((e) => {
    const [constraints, type, newTypeEnv] = inferExpression(
      typeEnv(env),
      e,
      new Constraints(),
      pump,
    );
    const subst = constraints.solve();
    const newType = type.apply(subst);

    const [v, newRuntime] = evaluate(e, runtime(env));

    results.push([v, newType]);
    env = mkEnv(newRuntime, newTypeEnv);
  });

  return [results, env];
};

export const execute = (
  t: string,
  env: Env = [{}, emptyTypeEnv],
): [Array<[any, Type]>, Env] => {
  const ast = parse(t);

  return executeProgram(ast, env);
};
