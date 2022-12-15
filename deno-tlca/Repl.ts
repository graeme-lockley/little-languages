import { defaultEnv, Env, executeProgram } from "./Interpreter.ts";
import { parse } from "./Parser.ts";
import { expressionToNestedString, nestedStringToString } from "./Values.ts";

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

const execute = (line: string, env: Env): Env => {
  const ast = parse(line);
  const [result, newEnv] = executeProgram(ast, env);

  ast.forEach((e, i) => {
    if (e.type === "DataDeclaration") {
      console.log(result[i][0].toString());
    } else {
      const [value, type] = result[i];

      console.log(
        nestedStringToString(expressionToNestedString(value, type!, e)),
      );
    }
  });

  return newEnv;
};

if (Deno.args.length === 0) {
  let env = defaultEnv;

  while (true) {
    const line = readline();

    if (line == null) {
      break;
    }

    env = execute(line, env);
  }
} else if (Deno.args.length === 1) {
  execute(Deno.readTextFileSync(Deno.args[0]), defaultEnv);
} else {
  console.error("Invalid arguments");
}
