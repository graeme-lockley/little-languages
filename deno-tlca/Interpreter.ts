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

// deno-lint-ignore no-explicit-any
type RuntimeValue = any;

type RuntimeEnv = { [key: string]: RuntimeValue };

export const runtime = (env: Env): RuntimeEnv => env[0];

export const typeEnv = (env: Env): TypeEnv => env[1];

export type Env = [RuntimeEnv, TypeEnv];

const mkEnv = (
  runtime: RuntimeEnv,
  typeEnv: TypeEnv,
): Env => [runtime, typeEnv];

export const emptyRuntimeEnv: RuntimeEnv = {};

export const emptyEnv = mkEnv(emptyRuntimeEnv, emptyTypeEnv);

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
    .extend(
      "string_length",
      new Scheme(new Set(), new TArr(typeString, typeInt)),
    )
    .extend(
      "string_concat",
      new Scheme(
        new Set(),
        new TArr(typeString, new TArr(typeString, typeString)),
      ),
    )
    .extend(
      "string_substring",
      new Scheme(
        new Set(),
        new TArr(typeString, new TArr(typeInt, new TArr(typeInt, typeString))),
      ),
    )
    .extend(
      "string_equal",
      new Scheme(
        new Set(),
        new TArr(typeString, new TArr(typeString, typeBool)),
      ),
    )
    .extend(
      "string_compare",
      new Scheme(
        new Set(),
        new TArr(typeString, new TArr(typeString, typeInt)),
      ),
    ),
);

const binaryOps = new Map<
  number,
  (v1: RuntimeValue, v2: RuntimeValue) => RuntimeValue
>([
  [Op.Equals, (a, b) => a === b],
  [Op.Plus, (a, b) => (a + b) | 0],
  [Op.Minus, (a, b) => (a - b) | 0],
  [Op.Times, (a, b) => (a * b) | 0],
  [Op.Divide, (a, b) => (a / b) | 0],
]);

const evaluate = (expr: Expression, runtimeEnv: RuntimeEnv): RuntimeValue => {
  if (expr.type === "App") {
    const operator = evaluate(expr.e1, runtimeEnv);
    const operand = evaluate(expr.e2, runtimeEnv);
    return operator(operand);
  }
  if (expr.type === "If") {
    return evaluate(expr.guard, runtimeEnv)
      ? evaluate(expr.then, runtimeEnv)
      : evaluate(expr.else, runtimeEnv);
  }
  if (expr.type === "Lam") {
    return (x: RuntimeValue): RuntimeValue => {
      const newRuntimeEnv = { ...runtimeEnv };
      newRuntimeEnv[expr.name] = x;
      return evaluate(expr.expr, newRuntimeEnv);
    };
  }
  if (expr.type === "Let" || expr.type === "LetRec") {
    return executeDeclaration(expr, runtimeEnv)[0];
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
    return expr.values.map((v) => evaluate(v, runtimeEnv));
  }
  if (expr.type === "LUnit") {
    return null;
  }
  if (expr.type === "Match") {
    const e = evaluate(expr.expr, runtimeEnv);

    for (const c of expr.cases) {
      const newEnv = matchPattern(c.pattern, e, runtimeEnv);
      if (newEnv !== null) {
        return evaluate(c.expr, newEnv);
      }
    }
    throw new Error("Match failed");
  }
  if (expr.type === "Op") {
    const left = evaluate(expr.left, runtimeEnv);
    const right = evaluate(expr.right, runtimeEnv);
    return binaryOps.get(expr.op)!(left, right);
  }
  if (expr.type === "Var") {
    return runtimeEnv[expr.name];
  }

  return null;
};

const matchPattern = (
  pattern: Pattern,
  value: RuntimeValue,
  runtimeEnv: RuntimeEnv,
): RuntimeEnv | null => {
  if (pattern.type === "PBool") {
    return pattern.value === value ? runtimeEnv : null;
  }
  if (pattern.type === "PInt") {
    return pattern.value === value ? runtimeEnv : null;
  }
  if (pattern.type === "PString") {
    return pattern.value === value ? runtimeEnv : null;
  }
  if (pattern.type === "PVar") {
    const newEnv = { ...runtimeEnv };
    newEnv[pattern.name] = value;
    return newEnv;
  }
  if (pattern.type === "PTuple") {
    let newRuntimeEnv: RuntimeEnv | null = runtimeEnv;
    for (let i = 0; i < pattern.values.length; i++) {
      newRuntimeEnv = matchPattern(pattern.values[i], value[i], newRuntimeEnv);
      if (newRuntimeEnv === null) {
        return null;
      }
    }
    return newRuntimeEnv;
  }
  if (pattern.type === "PUnit") {
    return value === null ? runtimeEnv : null;
  }
  if (pattern.type === "PWildcard") {
    return runtimeEnv;
  }
  return null;
};

const executeDeclaration = (
  expr: LetExpression | LetRecExpression,
  runtimeEnv: RuntimeEnv,
): [RuntimeValue, RuntimeEnv] => {
  const newRuntimeEnv = { ...runtimeEnv };
  const values: Array<RuntimeValue> = [];

  expr.declarations.forEach((d) => {
    const value = evaluate(d.expr, newRuntimeEnv);
    newRuntimeEnv[d.name] = value;
    values.push(value);
  });

  return (expr.expr === undefined)
    ? [values, newRuntimeEnv]
    : [evaluate(expr.expr, newRuntimeEnv), runtimeEnv];
};

const executeExpression = (
  expr: Expression,
  runtimeEnv: RuntimeEnv,
): [RuntimeValue, RuntimeEnv] =>
  (expr.type === "Let" || expr.type === "LetRec")
    ? executeDeclaration(expr, runtimeEnv)
    : [evaluate(expr, runtimeEnv), runtimeEnv];

export const executeProgram = (
  program: Program,
  env: Env,
): [Array<[RuntimeValue, Type]>, Env] => {
  const results: Array<[RuntimeValue, Type]> = [];
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

    const [value, newRuntime] = executeExpression(e, runtime(env));

    results.push([value, newType]);
    env = mkEnv(newRuntime, newTypeEnv);
  });

  return [results, env];
};

export const execute = (
  input: string,
  env: Env = emptyEnv,
): [Array<[RuntimeValue, Type]>, Env] => executeProgram(parse(input), env);

export const valueToString = (v: RuntimeValue, type: Type): string => {
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
      v.map((v: RuntimeValue, i: number) => valueToString(v, type.types[i]))
        .join(", ")
    })`;
  }
  return `${v}`;
};

export type NestedString = string | Array<NestedString>;

export const expressionToNestedString = (
  value: RuntimeValue,
  type: Type,
  expr: Expression,
): NestedString =>
  ((expr.type === "Let" || expr.type === "LetRec") && type instanceof TTuple)
    ? expr.declarations.map((d, i) =>
      `${d.name} = ${valueToString(value[i], type.types[i])}: ${type.types[i]}`
    )
    : `${valueToString(value, type)}: ${type}`;

export const nestedStringToString = (s: NestedString): string =>
  Array.isArray(s) ? s.map(nestedStringToString).join("\n") : s;
