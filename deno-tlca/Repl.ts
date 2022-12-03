import {
  emptyEnv,
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

let env = emptyEnv;

while (true) {
  const line = readline();

  if (line == null) {
    break;
  }

  const ast = parse(line);
  const [result, newEnv] = executeProgram(ast, env);

  ast.forEach((e, i) => {
    const [value, type] = result[i];

    console.log(nestedStringToString(expressionToNestedString(value, type, e)));
  });

  env = newEnv;
}
