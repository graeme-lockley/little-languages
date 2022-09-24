import { Expression, Op } from "./Parser.ts";
import { solver } from "./Solver.ts";
import {
  createFresh,
  Scheme,
  TArr,
  Type,
  typeBool,
  TypeEnv,
  typeError,
  typeInt,
} from "./Typing.ts";

export class Constraints {
  constraints: Array<[Type, Type]> = [];

  add(t1: Type, t2: Type) {
    this.constraints.push([t1, t2]);
  }
}

const ops = new Map([
  [Op.Equals, new TArr(typeInt, new TArr(typeInt, typeBool))],
  [Op.Plus, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Minus, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Times, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Divide, new TArr(typeInt, new TArr(typeInt, typeInt))],
]);

export const inferExpression = (
  env: TypeEnv,
  expression: Expression,
): [Constraints, Type] => {
  const constraints = new Constraints();
  const pump = createFresh();

  const infer = (env: TypeEnv, expr: Expression): Type => {
    if (expr.type === "App") {
      const t1 = infer(env, expr.e1);
      const t2 = infer(env, expr.e2);
      const tv = pump.next();

      constraints.add(t1, new TArr(t2, tv));

      return tv;
    }
    if (expr.type === "If") {
      const tg = infer(env, expr.guard);
      const tt = infer(env, expr.then);
      const et = infer(env, expr.else);

      constraints.add(tg, typeBool);
      constraints.add(tt, et);

      return tt;
    }
    if (expr.type === "Lam") {
      const tv = pump.next();
      const t = infer(env.extend(expr.name, new Scheme([], tv)), expr.expr);
      return new TArr(tv, t);
    }
    if (expr.type === "Let") {
      const tb = infer(env, expr.body);

      const subst = solver(constraints.constraints);

      const newEnv = env.apply(subst);
      const sc = newEnv.generalise(tb.apply(subst));

      return infer(newEnv.extend(expr.name, sc), expr.expr);
    }
    if (expr.type === "LBool") {
      return typeBool;
    }
    if (expr.type === "LInt") {
      return typeInt;
    }
    if (expr.type === "Op") {
      const tl = infer(env, expr.left);
      const tr = infer(env, expr.right);
      const tv = pump.next();

      const u1 = new TArr(tl, new TArr(tr, tv));
      const u2 = ops.get(expr.op)!;
      constraints.add(u1, u2);
      return tv;
    }
    if (expr.type === "Var") {
      const scheme = env.scheme(expr.name);

      if (scheme === undefined) throw `Unknown name: ${expr.name}`;

      return scheme.instantiate(pump);
    }

    return typeError;
  };

  return [constraints, infer(env, expression)];
};
