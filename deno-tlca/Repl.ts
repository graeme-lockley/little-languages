import {
  defaultEnv,
  executeProgram,
  expressionToNestedString,
  nestedStringToString,
} from "./Interpreter.ts";
import { parse } from "./Parser.ts";

const readline = (): string | null => {
  let result = "";

  while (true) {
    const line = prompt(result === "" ? ">" : ".");

    if (line === null) {
      return null;
    }

    result = (result + "\n" + line).trim();

    if (result.endsWith(";;")) {
      return result.substring(0, result.length - 2);
    }
  }
};

if (Deno.args.length === 0) {
  let env = defaultEnv;

  while (true) {
    const line = readline();

    if (line == null) {
      break;
    }

    const ast = parse(line);
    const [result, newEnv] = executeProgram(ast, env);

    ast.forEach((e, i) => {
      const [value, type] = result[i];

      console.log(
        nestedStringToString(expressionToNestedString(value, type, e)),
      );
    });

    env = newEnv;
  }
} else if (Deno.args.length === 1) {
  const file = Deno.readTextFileSync(Deno.args[0]);
  const ast = parse(file);
  const [result, _] = executeProgram(ast, defaultEnv);

  ast.forEach((e, i) => {
    const [value, type] = result[i];

    console.log(nestedStringToString(expressionToNestedString(value, type, e)));
  });
} else {
  console.error("Invalid arguments");
}
