import { Expression, Op } from "./Parser.ts";
import { Constraints } from "./Constraints.ts";
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
      let newEnv = env;

      for (const declaration of expr.declarations) {
        const tb = infer(newEnv, declaration.expr);

        const subst = constraints.solve();

        newEnv = newEnv.apply(subst);
        const sc = newEnv.generalise(tb.apply(subst));
        newEnv = newEnv.extend(declaration.name, sc);
      }

      return infer(newEnv, expr.expr);
    }
    if (expr.type === "LetRec") {
      let newEnv = env;
      const declarationBindings = new Map<string, Type>();

      for (const declaration of expr.declarations) {
        const type = pump.next();
        declarationBindings.set(declaration.name, type);
        newEnv = newEnv.extend(declaration.name, newEnv.generalise(type));
      }

      for (const declaration of expr.declarations) {
        const tb = infer(newEnv, declaration.expr);
        constraints.add(tb, declarationBindings.get(declaration.name)!);
      }

      const subst = constraints.solve();
      newEnv = newEnv.apply(subst);

      for (const declaration of expr.declarations) {
        const sc = newEnv.generalise(
          declarationBindings.get(declaration.name)!.apply(subst),
        );
        newEnv = newEnv.extend(declaration.name, sc);
        // console.log(declaration.name, ": ", JSON.stringify(sc));
      }

      return infer(newEnv, expr.expr);
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
