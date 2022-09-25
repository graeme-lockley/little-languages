import { nullSubs, Subst, TArr, TVar, Var } from "./Typing.ts";
import { Type } from "./Typing.ts";

type Constraint = [Type, Type];
type Unifier = [Subst, Array<Constraint>];

const emptyUnifier: Unifier = [nullSubs, []];

const bind = (
  name: Var,
  type: Type,
): Unifier => [new Subst(new Map([[name, type]])), []];

export const unifies = (t1: Type, t2: Type): Unifier => {
  if (t1 == t2) return emptyUnifier;
  if (t1 instanceof TVar) return bind(t1.name, t2);
  if (t2 instanceof TVar) return bind(t2.name, t1);
  if (t1 instanceof TArr && t2 instanceof TArr) {
    return unifyMany([t1.domain, t1.range], [t2.domain, t2.range]);
  }
  throw `Unification Mismatch: ${JSON.stringify(t1)} ${JSON.stringify(t2)}`;
};

const applyTypes = (s: Subst, ts: Array<Type>): Array<Type> =>
  ts.map((t) => t.apply(s));

export const unifyMany = (ta: Array<Type>, tb: Array<Type>): Unifier => {
  if (ta.length === 0 && tb.length === 0) return emptyUnifier;
  if (ta.length === 0 || tb.length === 0) {
    throw `Unification Mismatch: ${JSON.stringify(ta)} ${JSON.stringify(tb)}`;
  }

  const [t1, ...ts1] = ta;
  const [t2, ...ts2] = tb;

  const [su1, cs1] = unifies(t1, t2);
  const [su2, cs2] = unifyMany(applyTypes(su1, ts1), applyTypes(su1, ts2));

  return [su2.compose(su1), cs1.concat(cs2)];
};

export const solver = (constraints: Array<Constraint>): Subst => {
  let su = nullSubs;
  let cs = [...constraints];

  while (cs.length > 0) {
    const [[t1, t2], ...cs0] = cs;
    const [su1, cs1] = unifies(t1, t2);
    su = su1.compose(su);
    cs = cs1.concat(
      cs0.map(
        (constraint) => [
          constraint[0].apply(su1),
          constraint[1].apply(su1),
        ],
      ),
    );
  }

  return su;
};