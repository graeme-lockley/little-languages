import { find, InstructionOpCode } from "./instructions.ts";

type Value =
  | IntValue
  | BoolValue
  | ClosureValue;

type IntValue = {
  tag: "IntValue";
  value: number;
};

type BoolValue = {
  tag: "BoolValue";
  value: boolean;
};

type ClosureValue = {
  tag: "ClosureValue";
  ip: number;
  previous: Activation;
};

const valueToString = (v: Value): string => {
  switch (v.tag) {
    case "IntValue":
      return `${v.value}: Int`;
    case "BoolValue":
      return `${v.value}: Bool`;
    case "ClosureValue":
      return "function";
  }
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

export const execute = (
  block: Uint8Array,
  ip: number,
  options: ExecuteOptions = { debug: true },
) => {
  const stack: Array<Value> = [];
  let activation: Activation = [null, null, null, null];

  const stackToString = (): string => {
    const valueToString = (v: Value | null): string => {
      const activationDepth = (a: Activation | undefined): number =>
        a === undefined
          ? 0
          : a[1] === null
          ? 1
          : 1 + activationDepth(a[1].previous);

      if (v == null || v == undefined) {
        return "-";
      }

      switch (v.tag) {
        case "IntValue":
          return `${v.value}`;
        case "BoolValue":
          return `${v.value}`;
        case "ClosureValue":
          return `ClosureValue(${v.ip}, #${activationDepth(v.previous)})`;
      }
    };

    const activationToString = (a: Activation): string => {
      const [, closure, ip, variables] = a;

      const closureString = closure === null ? "-" : valueToString(closure);
      const ipString = ip === null ? "-" : `${ip}`;
      const variablesString = variables === null
        ? "-"
        : variables.map(valueToString).join(", ");

      return `<${closureString}, ${ipString}, [${variablesString}]>`;
    };

    return `[${stack.map(valueToString).join(", ")}] :: ${
      activationToString(activation)
    }`;
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

  const bciState = (): string => {
    return `ip: ${ip}, stack: ${stackToString()}, activation: ${activation}`;
  };

  const readInt = (): number => {
    const n = readIntFrom(ip);
    ip += 4;
    return n;
  };

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
        const closure = stack.pop() as ClosureValue;
        stack.push(v);
        const newActivation: Activation = [activation, closure, ip, null];
        ip = closure.ip;
        activation = newActivation;
        break;
      }
      case InstructionOpCode.ENTER: {
        const size = readInt();

        if (activation[3] === null) {
          activation[3] = Array(size);
        } else {
          throw new Error(`ENTER: Activation already exists: ${bciState()}`);
        }
        break;
      }
      case InstructionOpCode.RET: {
        if (activation[2] === null) {
          console.log(valueToString(stack.pop()!));
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
