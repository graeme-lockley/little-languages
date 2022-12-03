import { execute, mkEnv } from "./Interpreter.ts";
import { emptyTypeEnv, TArr } from "./Typing.ts";

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

let env = mkEnv({}, emptyTypeEnv);

while (true) {
  const line = readline();

  if (line == null) {
    break;
  }

  const [result, newEnv] = execute(line, env);
  console.log(
    result.map(([value, type]) => {
      if (type instanceof TArr) {
        return `- function: ${type}`;
      } else {
        return `- ${value}: ${type}`;
      }
    }).join("\n"),
  );
  env = newEnv;
}
