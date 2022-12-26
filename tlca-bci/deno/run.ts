import { find, InstructionOpCode } from "./instructions.ts";

// import { writeAllSync } from "https://deno.land/std/streams/conversion.ts";

type Value =
  | BoolValue
  | BuiltinValue
  | ClosureValue
  | DataValue
  | IntValue
  | StringValue
  | TupleValue
  | UnitValue;

type BoolValue = {
  tag: "BoolValue";
  value: boolean;
};

type BuiltinValue = {
  tag: "BuiltinValue";
  name: string;
};

type ClosureValue = {
  tag: "ClosureValue";
  ip: number;
  previous: Activation;
};

type DataValue = {
  tag: "DataValue";
  meta: number;
  id: number;
  values: Array<Value>;
};

type IntValue = {
  tag: "IntValue";
  value: number;
};

type StringValue = {
  tag: "StringValue";
  value: string;
};

type TupleValue = {
  tag: "TupleValue";
  values: Array<Value>;
};

type UnitValue = {
  tag: "UnitValue";
};

const builtins: {
  [key: string]: (stack: Array<Value>, block: Uint8Array) => void;
} = {
  "$$builtin-print": (stack: Array<Value>, block: Uint8Array) => {
    const v = stack.pop()!;
    // deno-lint-ignore no-deprecated-deno-api
    Deno.writeAllSync(
      Deno.stdout,
      encoder.encode(valueToString(v, false, block)),
    );
  },
  "$$builtin-println": (stack: Array<Value>, _block: Uint8Array) => {
    stack.pop()!;
    // deno-lint-ignore no-deprecated-deno-api
    Deno.writeAllSync(Deno.stdout, encoder.encode("\n"));
  },
};

const readIntFrom = (ip: number, block: Uint8Array): number =>
  block[ip] | (block[ip + 1] << 8) | (block[ip + 2] << 16) |
  (block[ip + 3] << 24);

const valueToString = (
  v: Value,
  withType = true,
  block: Uint8Array,
): string => {
  const dataNames = (meta: number): Array<string> => {
    const names: Array<string> = [];

    const numberOfNames = readIntFrom(meta, block) + 1;
    let nameIndex = 0;
    let i = meta + 4;
    while (nameIndex < numberOfNames) {
      const name: Array<string> = [];
      while (true) {
        const n = block[i++];
        if (n === 0) {
          break;
        }
        name.push(String.fromCharCode(n));
      }
      names.push(name.join(""));
      nameIndex++;
    }

    return names;
  };

  const value = (v: Value): string => {
    const activationDepth = (a: Activation | undefined): number =>
      a === undefined
        ? 0
        : a[1] === null
        ? 1
        : 1 + activationDepth(a[1].previous);

    switch (v.tag) {
      case "BoolValue":
        return `${v.value}`;
      case "BuiltinValue":
        return v.name;
      case "ClosureValue":
        return `c${v.ip}#${activationDepth(v.previous)}`;
      case "DataValue": {
        const names = dataNames(v.meta);

        return `${names[v.id + 1]}${
          v.values.map((e) =>
            e.tag === "DataValue" && e.values.length > 0
              ? ` (${value(e)})`
              : ` ${value(e)}`
          ).join("")
        }`;
      }
      case "IntValue":
        return `${v.value}`;
      case "StringValue":
        return withType ? `"${v.value.replace('"', '\\"')}"` : v.value;
      case "TupleValue":
        return `(${v.values.map(value).join(", ")})`;
      case "UnitValue":
        return "()";
    }
  };
  const type = (v: Value): string => {
    switch (v.tag) {
      case "BoolValue":
        return "Bool";
      case "BuiltinValue":
        return "Builtin";
      case "ClosureValue":
        return "Closure";
      case "DataValue":
        return dataNames(v.meta)[0];
      case "IntValue":
        return "Int";
      case "StringValue":
        return "String";
      case "TupleValue":
        return `(${v.values.map(type).join(" * ")})`;
      case "UnitValue":
        return "Unit";
    }
  };

  return withType ? `${value(v)}: ${type(v)}` : value(v);
};

type Activation = [
  Activation | null,
  ClosureValue | null,
  number | null,
  Array<Value> | null,
];

export type ExecuteOptions = {
  debug?: boolean;
};

const encoder = new TextEncoder();

export const execute = (
  block: Uint8Array,
  ip: number,
  options: ExecuteOptions = { debug: true },
) => {
  const stack: Array<Value> = [];
  let activation: Activation = [null, null, null, null];

  const stackToString = (): string => {
    const activationToString = (a: Activation): string => {
      const [, closure, ip, variables] = a;

      const activationString = a[0] === null ? "-" : activationToString(a[0]);
      const closureString = closure === null
        ? "-"
        : valueToString(closure, false, block);
      const ipString = ip === null ? "-" : `${ip}`;
      const variablesString = variables === null
        ? "-"
        : `[${
          variables.map((v) => valueToString(v, false, block)).join(", ")
        }]`;

      return `<${activationString}, ${closureString}, ${ipString}, ${variablesString}>`;
    };

    return `[${
      stack.map((v) => valueToString(v, false, block)).join(", ")
    }] :: ${activationToString(activation)}`;
  };

  const readIntFrom = (ip: number): number =>
    block[ip] | (block[ip + 1] << 8) | (block[ip + 2] << 16) |
    (block[ip + 3] << 24);

  const logInstruction = (instruction: InstructionOpCode) => {
    const op = find(instruction);

    if (op !== undefined) {
      const args = op.args.map((_, i) => readIntFrom(ip + i * 4));

      console.log(
        `${ip - 1}: ${op.name}${args.length > 0 ? " " : ""}${
          args.join(" ")
        }: ${stackToString()}`,
      );
    }
  };

  const bciState = (n = 0): string => {
    return `ip: ${
      ip - n
    }, stack: ${stackToString()}, activation: ${activation}`;
  };

  const readInt = (): number => {
    const n = readIntFrom(ip);
    ip += 4;
    return n;
  };
  const readString: () => string = () => {
    const result: Array<string> = [];
    while (true) {
      const n = block[ip++];
      if (n === 0) {
        break;
      }
      result.push(String.fromCharCode(n));
    }
    return result.join("");
  };

  readInt(); // skip offset to data segment

  while (true) {
    const op = block[ip++];

    if (options.debug) {
      logInstruction(op);
    }

    switch (op) {
      case InstructionOpCode.JMP: {
        ip = readInt();
        break;
      }

      case InstructionOpCode.JMP_TRUE: {
        const targetIP = readInt();
        const v = stack.pop() as BoolValue;

        if (v.value) {
          ip = targetIP;
        }

        break;
      }

      case InstructionOpCode.PUSH_BUILTIN: {
        const builtin = readString();
        if (builtins[builtin] === undefined) {
          throw new Error(`Unknown builtin: ${builtin}: ${bciState(1)}`);
        }

        stack.push({ tag: "BuiltinValue", name: builtin });
        break;
      }
      case InstructionOpCode.PUSH_CLOSURE: {
        const targetIP = readInt();

        const argument: ClosureValue = {
          tag: "ClosureValue",
          ip: targetIP,
          previous: activation,
        };
        stack.push(argument);
        break;
      }
      case InstructionOpCode.PUSH_DATA: {
        const meta = readInt();
        const id = readInt();
        const size = readInt();
        const values = stack.splice(stack.length - size, size);
        stack.push({ tag: "DataValue", meta, id, values });
        break;
      }
      case InstructionOpCode.PUSH_TRUE: {
        stack.push({ tag: "BoolValue", value: true });
        break;
      }
      case InstructionOpCode.PUSH_FALSE: {
        stack.push({ tag: "BoolValue", value: false });
        break;
      }
      case InstructionOpCode.PUSH_INT: {
        const value = readInt();

        stack.push({ tag: "IntValue", value });
        break;
      }
      case InstructionOpCode.PUSH_STRING: {
        const value = readString();

        stack.push({ tag: "StringValue", value });
        break;
      }
      case InstructionOpCode.PUSH_TUPLE: {
        const size = readInt();
        const values = stack.splice(stack.length - size, size);
        stack.push({ tag: "TupleValue", values });
        break;
      }
      case InstructionOpCode.PUSH_UNIT: {
        stack.push({ tag: "UnitValue" });
        break;
      }
      case InstructionOpCode.PUSH_VAR: {
        let index = readInt();
        const offset = readInt();

        let a = activation;
        while (index > 0) {
          a = a[1]!.previous;
          index -= 1;
        }
        stack.push(a![3]![offset]);
        break;
      }
      case InstructionOpCode.ADD: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value + b.value) | 0 });
        break;
      }
      case InstructionOpCode.SUB: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value - b.value) | 0 });
        break;
      }
      case InstructionOpCode.MUL: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value * b.value) | 0 });
        break;
      }
      case InstructionOpCode.DIV: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value / b.value) | 0 });
        break;
      }
      case InstructionOpCode.EQ: {
        const a = stack.pop() as IntValue;
        const b = stack.pop() as IntValue;

        stack.push({ tag: "BoolValue", value: a.value === b.value });
        break;
      }
      case InstructionOpCode.SWAP_CALL: {
        const v = stack.pop()!;
        const closure = stack.pop()!;
        stack.push(v);

        if (closure.tag === "ClosureValue") {
          const newActivation: Activation = [activation, closure, ip, null];
          ip = closure.ip;
          activation = newActivation;
        } else if (closure.tag === "BuiltinValue") {
          const builtin = builtins[closure.name];
          if (builtin === undefined) {
            throw new Error(`Unknown builtin: ${closure.name}: ${bciState(1)}`);
          }
          builtin(stack, block);
        } else {
          throw new Error(`SWAP_CALL: Not a closure: ${bciState(1)}`);
        }
        break;
      }
      case InstructionOpCode.ENTER: {
        const size = readInt();

        if (activation[3] === null) {
          activation[3] = Array(size).fill(undefined);
        } else {
          throw new Error(`ENTER: Activation already exists: ${bciState()}`);
        }
        break;
      }
      case InstructionOpCode.RET: {
        if (activation[2] === null) {
          const v = stack.pop()!;

          if (v.tag !== "UnitValue") {
            console.log(valueToString(v, true, block));
          }
          Deno.exit(0);
        }

        ip = activation[2];
        activation = activation[0]!;
        break;
      }
      case InstructionOpCode.STORE_VAR: {
        const index = readInt();

        if (activation[3] === null) {
          throw new Error(
            `STORE_VAR: Activation does not exist: ${bciState()}`,
          );
        } else {
          activation[3][index] = stack.pop() as Value;
        }
        break;
      }
      default:
        throw new Error(`Unknown InstructionOpCode: ${op}`);
    }
  }
};
