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

  const ds = (data[lp] | (data[lp + 1] << 8) | (data[lp + 2] << 16) |
    (data[lp + 3] << 24)) >>> 0;

  lp += 4;

  while (lp < ds) {
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

  if (lp < data.length) {
    console.log("Data segment:");
    let isText = (data[lp] < 32) ? false : true;
    const encoder = new TextEncoder();

    // deno-lint-ignore no-deprecated-deno-api
    Deno.writeAllSync(Deno.stdout, encoder.encode(`${lp}:`));
    while (lp < data.length) {
      const ch = data[lp];
      const nextIsText = ch < 32 ? false : true;

      if (isText && nextIsText) {
        // deno-lint-ignore no-deprecated-deno-api
        Deno.writeAllSync(Deno.stdout, encoder.encode(String.fromCharCode(ch)));
      } else if (isText && !nextIsText) {
        // deno-lint-ignore no-deprecated-deno-api
        Deno.writeAllSync(
          Deno.stdout,
          encoder.encode(`\n${lp}: 0x${ch.toString(16)}`),
        );
      } else if (!isText && nextIsText) {
        // deno-lint-ignore no-deprecated-deno-api
        Deno.writeAllSync(
          Deno.stdout,
          encoder.encode(`\n${lp}: ${String.fromCharCode(ch)}`),
        );
      } else {
        // deno-lint-ignore no-deprecated-deno-api
        Deno.writeAllSync(Deno.stdout, encoder.encode(` 0x${ch.toString(16)}`));
      }

      isText = nextIsText;
      lp += 1;
    }
    // deno-lint-ignore no-deprecated-deno-api
    Deno.writeAllSync(Deno.stdout, encoder.encode("\n"));
  }
};
