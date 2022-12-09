import { Expression, Op, Pattern, Program } from "./Parser.ts";
import { Constraints } from "./Constraints.ts";
import {
  createFresh,
  Pump,
  Scheme,
  TArr,
  TTuple,
  Type,
  typeBool,
  TypeEnv,
  typeError,
  typeInt,
  typeString,
  typeUnit,
} from "./Typing.ts";

const ops = new Map([
  [Op.Equals, new TArr(typeInt, new TArr(typeInt, typeBool))],
  [Op.Plus, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Minus, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Times, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Divide, new TArr(typeInt, new TArr(typeInt, typeInt))],
]);

export const inferProgram = (
  env: TypeEnv,
  program: Program,
  constraints: Constraints = new Constraints(),
  pump: Pump = createFresh(),
): [Constraints, Array<Type>, TypeEnv] => {
  const types: Array<Type> = [];
  program.forEach((e) => {
    const [, tp, newEnv] = inferExpression(env, e, constraints, pump);

    types.push(tp);
    env = newEnv;
  });

  return [constraints, types, env];
};

export const inferExpression = (
  env: TypeEnv,
  expression: Expression,
  constraints: Constraints = new Constraints(),
  pump: Pump = createFresh(),
): [Constraints, Type, TypeEnv] => {
  const fix = (
    env: TypeEnv,
    expr: Expression,
    constraints: Constraints,
  ): Type => {
    const [_, t1] = inferExpression(env, expr, constraints, pump);
    const tv = pump.next();

    constraints.add(new TArr(tv, tv), t1);

    return tv;
  };

  const infer = (env: TypeEnv, expr: Expression): [Type, TypeEnv] => {
    if (expr.type === "App") {
      const [t1] = infer(env, expr.e1);
      const [t2] = infer(env, expr.e2);
      const tv = pump.next();

      constraints.add(t1, new TArr(t2, tv));

      return [tv, env];
    }
    if (expr.type === "If") {
      const [tg] = infer(env, expr.guard);
      const [tt] = infer(env, expr.then);
      const [et] = infer(env, expr.else);

      constraints.add(tg, typeBool);
      constraints.add(tt, et);

      return [tt, env];
    }
    if (expr.type === "Lam") {
      const tv = pump.next();
      const [t] = infer(env.extend(expr.name, new Scheme([], tv)), expr.expr);
      return [new TArr(tv, t), env];
    }
    if (expr.type === "Let") {
      let newEnv = env;
      const types: Array<Type> = [];

      for (const declaration of expr.declarations) {
        const [nc, tb] = inferExpression(
          newEnv,
          declaration.expr,
          constraints.clone(),
          pump,
        );

        const subst = nc.solve();

        newEnv = newEnv.apply(subst);
        const type = tb.apply(subst);
        types.push(type);
        const sc = newEnv.generalise(type);
        newEnv = newEnv.extend(declaration.name, sc);
      }

      if (expr.expr === undefined) {
        return [new TTuple(types), newEnv];
      } else {
        return [infer(newEnv, expr.expr)[0], env];
      }
    }
    if (expr.type === "LetRec") {
      const tvs = pump.nextN(expr.declarations.length);
      const newEnv = expr.declarations.reduce(
        (acc, declaration, idx) =>
          acc.extend(declaration.name, new Scheme([], tvs[idx])),
        env,
      );

      const nc = constraints.clone();
      const declarationType = fix(
        newEnv,
        {
          type: "Lam",
          name: "_bob",
          expr: {
            type: "LTuple",
            values: expr.declarations.map((d) => d.expr),
          },
        },
        nc,
      );
      nc.add(new TTuple(tvs), declarationType);
      const types: Array<Type> = [];

      const subst = nc.solve();
      const solvedTypeEnv = env.apply(subst);
      const solvedEnv = expr.declarations.reduce(
        (acc, declaration, idx) => {
          const type: Type = tvs[idx].apply(subst);
          types.push(type);

          return acc.extend(
            declaration.name,
            solvedTypeEnv.generalise(type),
          );
        },
        solvedTypeEnv,
      );

      if (expr.expr === undefined) {
        return [new TTuple(types), solvedEnv];
      } else {
        return [infer(solvedEnv, expr.expr)[0], env];
      }
    }
    if (expr.type === "LBool") {
      return [typeBool, env];
    }
    if (expr.type === "LInt") {
      return [typeInt, env];
    }
    if (expr.type === "LString") {
      return [typeString, env];
    }
    if (expr.type === "LTuple") {
      return [new TTuple(expr.values.map((v) => infer(env, v)[0])), env];
    }
    if (expr.type === "LUnit") {
      return [typeUnit, env];
    }
    if (expr.type === "Match") {
      const [t] = infer(env, expr.expr);
      const tv = pump.next();

      for (const { pattern, expr: pexpr } of expr.cases) {
        const [tp, newEnv] = inferPattern(env, pattern, constraints, pump);
        const [te] = infer(newEnv, pexpr);
        constraints.add(tp, t);
        constraints.add(te, tv);
      }

      return [tv, env];
    }
    if (expr.type === "Op") {
      const [tl] = infer(env, expr.left);
      const [tr] = infer(env, expr.right);
      const tv = pump.next();

      const u1 = new TArr(tl, new TArr(tr, tv));
      const u2 = ops.get(expr.op)!;
      constraints.add(u1, u2);
      return [tv, env];
    }
    if (expr.type === "Var") {
      const scheme = env.scheme(expr.name);

      if (scheme === undefined) throw `Unknown name: ${expr.name}`;

      return [scheme.instantiate(pump), env];
    }

    return [typeError, env];
  };

  return [constraints, ...infer(env, expression)];
};

export const inferPattern = (
  env: TypeEnv,
  pattern: Pattern,
  constraints: Constraints = new Constraints(),
  pump: Pump = createFresh(),
): [Type, TypeEnv] => {
  if (pattern.type === "PBool") {
    return [typeBool, env];
  }
  if (pattern.type === "PInt") {
    return [typeInt, env];
  }
  if (pattern.type === "PString") {
    return [typeString, env];
  }
  if (pattern.type === "PTuple") {
    const values: Array<Type> = [];
    let newEnv = env;
    for (const p of pattern.values) {
      const [t, e] = inferPattern(newEnv, p, constraints, pump);
      values.push(t);
      newEnv = e;
    }
    return [new TTuple(values), newEnv];
  }
  if (pattern.type === "PUnit") {
    return [typeUnit, env];
  }
  if (pattern.type === "PVar") {
    const tv = pump.next();
    return [tv, env.extend(pattern.name, new Scheme([], tv))];
  }
  if (pattern.type === "PWildcard") {
    return [pump.next(), env];
  }

  return [typeError, env];
};
