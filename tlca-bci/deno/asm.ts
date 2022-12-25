import { findOnName as findInstruction, OpParameter } from "./instructions.ts";

export const asm = (text: string): Uint8Array => {
  const lines = text.split("\n");
  const result: Array<number> = [];
  const labels = new Map<string, number>();
  const patch: Array<[number, string, string]> = [];

  const appendInt = (n: number) => {
    result.push(n & 0xFF);
    result.push((n >> 8) & 0xFF);
    result.push((n >> 16) & 0xFF);
    result.push((n >> 24) & 0xFF);
  };

  const writeIntAt = (n: number, pos: number) => {
    result[pos] = n & 0xFF;
    result[pos + 1] = (n >> 8) & 0xFF;
    result[pos + 2] = (n >> 16) & 0xFF;
    result[pos + 3] = (n >> 24) & 0xFF;
  };

  for (const line in lines) {
    const l = lines[line].trim();
    if (l.startsWith("#") || l === "") {
      continue;
    }
    if (l.startsWith(":")) {
      labels.set(l.slice(1), result.length);
      continue;
    }
    const [name, ...args] = l.split(" ");
    const instruction = findInstruction(name);
    if (instruction === undefined) {
      throw new Error(`Unknown instruction: ${line}: ${name}`);
    }
    if (args.length !== instruction.args.length) {
      throw new Error(
        `Wrong number of arguments: ${line}: ${name}: expected ${instruction.args.length}: got ${args.length}`,
      );
    }

    result.push(instruction.opcode);
    for (const [i, arg] of args.entries()) {
      if (instruction.args[i] === OpParameter.OPInt) {
        try {
          appendInt(parseInt(args[i]));
        } catch (e) {
          throw new Error(`Invalid argument: ${line}: ${name}: ${arg}: ${e}`);
        }
      } else {
        patch.push([result.length, arg, line]);
        appendInt(0);
      }
    }
  }

  for (const [pos, label, line] of patch) {
    if (!labels.has(label)) {
      throw new Error(`Unknown label: ${line}: ${label}`);
    }
    writeIntAt(labels.get(label)!, pos);
  }

  return new Uint8Array(result);
};

export const writeBinary = (filename: string, data: Uint8Array) => {
  const file = Deno.createSync(filename);
  Deno.writeSync(file.rid, data);
  Deno.close(file.rid);
};
