import { find as findInstruction } from "./instructions.ts";

export const readBinary = (filename: string): Uint8Array => {
  const file = Deno.openSync(filename, { read: true, write: false });
  const fileSize = Deno.fstatSync(file.rid).size;
  const data = new Uint8Array(fileSize);
  const bytesRead = Deno.readSync(file.rid, data);
  Deno.close(file.rid);
  if (fileSize !== bytesRead) {
    throw new Error(
      `Could not read all data from ${filename}: ${bytesRead} of ${fileSize} bytes read`,
    );
  }

  return data;
};

export const dis = (data: Uint8Array) => {
  let lp = 0;

  while (lp < data.length) {
    const op = data[lp++];
    const instruction = findInstruction(op);
    if (instruction === undefined) {
      throw new Error(`Unknown opcode: ${op}`);
    }
    console.log(
      `${lp - 1}: ${instruction.name}`,
      ...instruction.args.map(() => {
        const n = (data[lp] | (data[lp + 1] << 8) | (data[lp + 2] << 16) |
          (data[lp + 3] << 24)) >>> 0;
        lp += 4;
        return n;
      }),
    );
  }
};
