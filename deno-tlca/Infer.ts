import { Expression, Op, Program } from "./Parser.ts";
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
): [Constraints, Type, TypeEnv] => {
  let t: Type = typeUnit;

  program.forEach((e) => {
    const [, tp, newEnv] = inferExpression(env, e, constraints, pump);

    t = tp;
    env = newEnv;
  });

  return [constraints, t, env];
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

      for (const declaration of expr.declarations) {
        const [nc, tb] = inferExpression(
          newEnv,
          declaration.expr,
          constraints.clone(),
          pump,
        );

        const subst = nc.solve();

        newEnv = newEnv.apply(subst);
        const sc = newEnv.generalise(tb.apply(subst));
        newEnv = newEnv.extend(declaration.name, sc);
      }

      return [typeUnit, newEnv];
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
      const subst = nc.solve();
      const solvedTypeEnv = env.apply(subst);
      const solvedEnv = expr.declarations.reduce(
        (acc, declaration, idx) =>
          acc.extend(
            declaration.name,
            solvedTypeEnv.generalise(tvs[idx].apply(subst)),
          ),
        solvedTypeEnv,
      );

      return [typeUnit, solvedEnv];
    }
    if (expr.type === "LBool") {
      return [typeBool, env];
    }
    if (expr.type === "LInt") {
      return [typeInt, env];
    }
    if (expr.type === "LTuple") {
      return [new TTuple(expr.values.map((v) => infer(env, v)[0])), env];
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