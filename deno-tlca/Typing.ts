import * as Sets from "./Set.ts";
import * as Maps from "./Map.ts";

export type Var = string;

export interface Type {
  apply: (s: Subst) => Type;
  ftv: () => Set<Var>;
}

export class TVar implements Type {
  name: Var;

  constructor(name: Var) {
    this.name = name;
  }

  apply(s: Subst): Type {
    return s.get(this.name) || this;
  }

  ftv(): Set<Var> {
    return new Set([this.name]);
  }

  toString(): string {
    return this.name;
  }
}

export class TCon implements Type {
  name: string;
  args: Array<Type>;

  constructor(
    name: string,
    args: Array<Type> = [],
  ) {
    this.name = name;
    this.args = args;
  }

  apply(s: Subst): Type {
    if (this.args.length === 0) {
      return this;
    }

    return new TCon(
      this.name,
      this.args.map((a) => a.apply(s)),
    );
  }
  ftv(): Set<Var> {
    return Sets.flatUnion(this.args.map((t) => t.ftv()));
  }

  toString(): string {
    return `${this.name}${this.args.length > 0 ? " " : ""}${
      this.args.map((t) =>
        (t instanceof TCon && t.args.length > 0 || t instanceof TArr)
          ? `(${t.toString()})`
          : t.toString()
      ).join(" ")
    }`;
  }
}

export class TArr implements Type {
  domain: Type;
  range: Type;

  constructor(domain: Type, range: Type) {
    this.domain = domain;
    this.range = range;
  }

  apply(s: Subst): Type {
    return new TArr(this.domain.apply(s), this.range.apply(s));
  }

  ftv(): Set<Var> {
    return new Set([...this.domain.ftv(), ...this.range.ftv()]);
  }

  toString(): string {
    if (this.domain instanceof TArr) {
      return `(${this.domain}) -> ${this.range}`;
    } else {
      return `${this.domain} -> ${this.range}`;
    }
  }
}

export class TTuple implements Type {
  types: Type[];

  constructor(types: Type[]) {
    this.types = types;
  }

  apply(s: Subst): Type {
    return new TTuple(this.types.map((t) => t.apply(s)));
  }

  ftv(): Set<Var> {
    return new Set(this.types.flatMap((t) => [...t.ftv()]));
  }

  toString(): string {
    return `(${this.types.join(" * ")})`;
  }
}

export const typeBool = new TCon("Bool");
export const typeError = new TCon("Error");
export const typeInt = new TCon("Int");
export const typeString = new TCon("String");
export const typeUnit = new TCon("()");

export class Subst {
  protected items: Map<Var, Type>;

  constructor(items: Map<Var, Type>) {
    this.items = items;
  }

  compose(s: Subst): Subst {
    return new Subst(
      Maps.union(Maps.map(s.items, (v) => v.apply(this)), this.items),
    );
  }

  get(v: Var): Type | undefined {
    return this.items.get(v);
  }

  entries(): Array<[Var, Type]> {
    return [...this.items.entries()];
  }

  remove(names: Set<Var>): Subst {
    return new Subst(Maps.removeKeys(this.items, names));
  }
}

export const nullSubs = new Subst(new Map());

export class Scheme {
  names: Set<Var>;
  type: Type;

  constructor(names: Set<Var>, type: Type) {
    this.names = names;
    this.type = type;
  }

  apply(s: Subst): Scheme {
    return new Scheme(this.names, this.type.apply(s.remove(this.names)));
  }

  ftv(): Set<Var> {
    return Sets.difference(this.type.ftv(), new Set(this.names));
  }

  instantiate(pump: Pump): Type {
    const subst = new Subst(
      new Map([...this.names].map((n) => [n, pump.next()])),
    );

    return this.type.apply(subst);
  }
}

export class ADT {
  name: string;
  parameters: Set<string>;
  constructors: Array<TCon>;

  constructor(
    name: string,
    parameters: Set<string>,
    constructors: Array<TCon>,
  ) {
    this.name = name;
    this.parameters = parameters;
    this.constructors = constructors;
  }

  toString(): string {
    return `${this.name}${this.parameters.size > 0 ? " " : ""}${
      [...this.parameters].join(" ")
    } = ${this.constructors.map((c) => c.toString()).join(" | ")}`;
  }
}

export class TypeEnv {
  protected values: Map<string, Scheme>;
  protected adts: Map<string, ADT>;

  constructor(values: Map<string, Scheme>, adts: Map<string, ADT>) {
    this.values = values;
    this.adts = adts;
  }

  extend(name: string, scheme: Scheme): TypeEnv {
    const result = Maps.clone(this.values);

    result.set(name, scheme);

    return new TypeEnv(result, this.adts);
  }

  addData(adt: ADT): TypeEnv {
    const result = Maps.clone(this.adts);

    result.set(adt.name, adt);

    return new TypeEnv(this.values, result);
  }

  apply(s: Subst): TypeEnv {
    return new TypeEnv(
      Maps.map(this.values, (scheme) => scheme.apply(s)),
      this.adts,
    );
  }

  ftv(): Set<Var> {
    return Sets.flatUnion([...this.values.values()].map((v) => v.ftv()));
  }

  scheme(name: string): Scheme | undefined {
    return this.values.get(name);
  }

  data(name: string): ADT | undefined {
    return this.adts.get(name);
  }

  generalise(t: Type): Scheme {
    return new Scheme(Sets.difference(t.ftv(), this.ftv()), t);
  }
}

export const emptyTypeEnv = new TypeEnv(new Map(), new Map());

export type Pump = { next: () => TVar; nextN: (n: number) => Array<TVar> };

export const createFresh = (): Pump => {
  let count = 0;

  return {
    next: (): TVar => new TVar("V" + ++count),
    nextN: (n: number): Array<TVar> =>
      Array(n).fill(0).map(() => new TVar("V" + ++count)),
  };
};
