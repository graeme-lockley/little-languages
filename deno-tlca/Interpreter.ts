// deno-lint-ignore-file no-explicit-any
import { Constraints } from "./Constraints.ts";
import { inferExpression } from "./Infer.ts";
import {
  Expression,
  LetExpression,
  LetRecExpression,
  Op,
  parse,
  Pattern,
  Program,
} from "./Parser.ts";
import {
  createFresh,
  emptyTypeEnv,
  Scheme,
  TArr,
  TTuple,
  Type,
  typeBool,
  TypeEnv,
  typeInt,
  typeString,
  typeUnit,
} from "./Typing.ts";

const binaryOps = new Map<number, (v1: any, v2: any) => any>([
  [Op.Equals, (a, b) => a === b],
  [Op.Plus, (a, b) => (a + b) | 0],
  [Op.Minus, (a, b) => (a - b) | 0],
  [Op.Times, (a, b) => (a * b) | 0],
  [Op.Divide, (a, b) => (a / b) | 0],
]);

const evaluate = (expr: Expression, env: any): any => {
  if (expr.type === "App") {
    const operator = evaluate(expr.e1, env);
    const operand = evaluate(expr.e2, env);
    return operator(operand);
  }
  if (expr.type === "If") {
    return evaluate(expr.guard, env)
      ? evaluate(expr.then, env)
      : evaluate(expr.else, env);
  }
  if (expr.type === "Lam") {
    return (x: any): any => {
      const newEnv = { ...env };
      newEnv[expr.name] = x;
      return evaluate(expr.expr, newEnv);
    };
  }
  if (expr.type === "Let" || expr.type === "LetRec") {
    return executeDeclaration(expr, env)[0];
  }
  if (expr.type === "LBool") {
    return expr.value;
  }
  if (expr.type === "LInt") {
    return expr.value;
  }
  if (expr.type === "LString") {
    return expr.value;
  }
  if (expr.type === "LTuple") {
    return expr.values.map((v) => evaluate(v, env));
  }
  if (expr.type === "LUnit") {
    return null;
  }
  if (expr.type === "Match") {
    const e = evaluate(expr.expr, env);

    for (const c of expr.cases) {
      const newEnv = matchPattern(c.pattern, e, env);
      if (newEnv !== null) {
        return evaluate(c.expr, newEnv);
      }
    }
    throw new Error("Match failed");
  }
  if (expr.type === "Op") {
    const left = evaluate(expr.left, env);
    const right = evaluate(expr.right, env);
    return binaryOps.get(expr.op)!(left, right);
  }
  if (expr.type === "Var") {
    return env[expr.name];
  }

  return null;
};

const matchPattern = (pattern: Pattern, value: any, env: any): any => {
  if (pattern.type === "PBool") {
    return pattern.value === value ? env : null;
  }
  if (pattern.type === "PInt") {
    return pattern.value === value ? env : null;
  }
  if (pattern.type === "PString") {
    return pattern.value === value ? env : null;
  }
  if (pattern.type === "PVar") {
    const newEnv = { ...env };
    newEnv[pattern.name] = value;
    return newEnv;
  }
  if (pattern.type === "PTuple") {
    let newEnv = env;
    for (let i = 0; i < pattern.values.length; i++) {
      newEnv = matchPattern(pattern.values[i], value[i], newEnv);
      if (newEnv === null) {
        return null;
      }
    }
    return newEnv;
  }
  if (pattern.type === "PUnit") {
    return value === null ? env : null;
  }
  if (pattern.type === "PWildcard") {
    return env;
  }
  return null;
};

export type Env = [any, TypeEnv];

const mkEnv = (
  runtime: any,
  typeEnv: TypeEnv,
): Env => [runtime, typeEnv];

export const emptyEnv = mkEnv({}, emptyTypeEnv);

export const defaultEnv = mkEnv(
  {
    string_length: (s: string) => s.length,
    string_concat: (s1: string) => (s2: string) => s1 + s2,
    string_substring: (s: string) => (start: number) => (end: number) =>
      s.slice(start, end),
    string_equal: (s1: string) => (s2: string) => s1 === s2,
    string_compare: (s1: string) => (s2: string) =>
      s1 < s2 ? -1 : s1 === s2 ? 0 : 1,
  },
  emptyTypeEnv
    .extend("string_length", new Scheme([], new TArr(typeString, typeInt)))
    .extend(
      "string_concat",
      new Scheme([], new TArr(typeString, new TArr(typeString, typeString))),
    )
    .extend(
      "string_substring",
      new Scheme(
        [],
        new TArr(typeString, new TArr(typeInt, new TArr(typeInt, typeString))),
      ),
    )
    .extend(
      "string_equal",
      new Scheme([], new TArr(typeString, new TArr(typeString, typeBool))),
    )
    .extend(
      "string_compare",
      new Scheme([], new TArr(typeString, new TArr(typeString, typeInt))),
    ),
);

export const runtime = (env: Env): any => env[0];
export const typeEnv = (env: Env): TypeEnv => env[1];

const executeDeclaration = (
  expr: LetExpression | LetRecExpression,
  env: any,
): [any, any] => {
  const newEnv = { ...env };
  const values: Array<any> = [];
  expr.declarations.forEach((d) => {
    const value = evaluate(d.expr, newEnv);
    newEnv[d.name] = value;
    values.push(value);
  });

  if (expr.expr === undefined) {
    return [values, newEnv];
  } else {
    return [evaluate(expr.expr, newEnv), env];
  }
};

const executeExpression = (expr: Expression, env: any): [any, any] => {
  if (expr.type === "Let" || expr.type === "LetRec") {
    return executeDeclaration(expr, env);
  }
  return [evaluate(expr, env), env];
};

export const executeProgram = (
  program: Program,
  env: Env,
): [Array<[any, Type]>, Env] => {
  const results: Array<[any, Type]> = [];
  const pump = createFresh();

  program.forEach((e) => {
    if (e.type === "DataDeclaration") {
      throw new Error("executeProgram: Data declarations not supported yet");
    }

    const [constraints, type, newTypeEnv] = inferExpression(
      typeEnv(env),
      e,
      new Constraints(),
      pump,
    );
    const subst = constraints.solve();
    const newType = type.apply(subst);

    const [v, newRuntime] = executeExpression(e, runtime(env));

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

export const valueToString = (v: any, type: Type): string => {
  if (type === typeUnit) {
    return "()";
  }
  if (type === typeString) {
    return `"${v.replaceAll('"', '\\"')}"`;
  }
  if (type instanceof TArr) {
    return "function";
  }
  if (type instanceof TTuple) {
    return `(${
      v.map((v: any, i: number) => valueToString(v, type.types[i])).join(", ")
    })`;
  }
  return `${v}`;
};

export type NestedString = string | Array<NestedString>;

export const expressionToNestedString = (
  value: any,
  type: Type,
  e: Expression,
): NestedString => {
  if ((e.type === "Let" || e.type === "LetRec") && type instanceof TTuple) {
    return e.declarations.map((d, i) =>
      `${d.name} = ${valueToString(value[i], type.types[i])}: ${type.types[i]}`
    );
  } else {
    return `${valueToString(value, type)}: ${type}`;
  }
};

export const nestedStringToString = (s: NestedString): string => {
  if (Array.isArray(s)) {
    return s.map(nestedStringToString).join("\n");
  } else {
    return s;
  }
};
