import { scanner, TokenType } from "./Scanner.ts";

/*
program
  : expression
  ;

expression
  : multiplicative {multiplicative}
  ;

multiplicative
  : additive {['*' | '/'] additive}
  ;

additive
  : factor {['*' | '/'] factor}
  ;

factor
  : '(' expression ')'
  | literal_integer
  | 'True'
  | 'False'
  | '\' identifier {identifier} '->' expression
  | 'let' ['rec'] declaration {';' declaration}'in' expression
  | 'if' '(' expression ')' expression 'else' expression
  | identifier
  ;

declaration
  : identifier {identifier} '=' expression
  ;
*/

export type Program = Expression;

export type Expression =
  | AppExpression
  | IfExpression
  | LamExpression
  | LetExpression
  | LBoolExpression
  | LIntExpression
  | OpExpression
  | VarExpression;

export type AppExpression = {
  type: "App";
  e1: Expression;
  e2: Expression;
};

export type IfExpression = {
  type: "If";
  guard: Expression;
  then: Expression;
  else: Expression;
};

export type LetExpression = {
  type: "Let";
  declarations: Array<Declaration>;
  expr: Expression;
};

export type LetRecExpression = {
  type: "LetRec";
  declarations: Array<Declaration>;
  expr: Expression;
};

export type Declaration = {
  type: "Declaration";
  name: string;
  expr: Expression;
};

export type LamExpression = {
  type: "Lam";
  name: string;
  expr: Expression;
};

export type LBoolExpression = {
  type: "LBool";
  value: boolean;
};

export type LIntExpression = {
  type: "LInt";
  value: number;
};

export type OpExpression = {
  type: "Op";
  left: Expression;
  op: Op;
  right: Expression;
};

export enum Op {
  Equals,
  Plus,
  Minus,
  Times,
  Divide,
}

export type VarExpression = {
  type: "Var";
  name: string;
};

export const parse = (input: string): Program => {
  const tokens = scanner(input);

  const current = () => tokens[0]?.type;

  const lexeme = () => tokens[0]?.lexeme;

  const skipToken = () => tokens.shift();

  const token = () => tokens[0];

  const matchToken = (type: TokenType) => {
    const token = tokens[0];

    if (token.type === type) {
      skipToken();
      return token.lexeme;
    } else {
      throw {
        type: "ParserError",
        token,
        expected: [type],
      };
    }
  };

  const program = (): Program => expression();

  const expression = (): Expression => {
    let f = relational();

    const firstFactor = [
      TokenType.OpenParen,
      TokenType.LiteralInt,
      TokenType.Backslash,
      TokenType.Let,
      TokenType.Identifier,
      TokenType.If,
      TokenType.True,
      TokenType.False,
    ];

    if (firstFactor.includes(current())) {
      while (firstFactor.includes(current())) {
        f = {
          type: "App",
          e1: f,
          e2: relational(),
        };
      }
    }

    return f;
  };

  const relational = (): Expression => {
    let f = additive();

    if (current() === TokenType.EqualEqual) {
      skipToken();
      f = {
        type: "Op",
        left: f,
        op: Op.Equals,
        right: additive(),
      };
    }

    return f;
  };

  const additive = (): Expression => {
    let f = multiplicative();

    while (current() === TokenType.Plus || current() === TokenType.Minus) {
      const op = current();
      skipToken();
      f = {
        type: "Op",
        left: f,
        op: op === TokenType.Plus ? Op.Plus : Op.Minus,
        right: multiplicative(),
      };
    }

    return f;
  };

  const multiplicative = (): Expression => {
    let f = factor();

    while (current() === TokenType.Star || current() === TokenType.Slash) {
      const op = current();
      skipToken();
      f = {
        type: "Op",
        left: f,
        op: op === TokenType.Star ? Op.Times : Op.Divide,
        right: factor(),
      };
    }

    return f;
  };

  const factor = (): Expression => {
    if (current() === TokenType.Identifier) {
      const name = lexeme();
      skipToken();

      return {
        type: "Var",
        name,
      };
    } else if (current() === TokenType.OpenParen) {
      skipToken();
      const result = expression();
      matchToken(TokenType.CloseParen);

      return result;
    } else if (current() === TokenType.LiteralInt) {
      const value = parseInt(lexeme());
      skipToken();

      return {
        type: "LInt",
        value,
      };
    } else if (current() === TokenType.True) {
      skipToken();

      return {
        type: "LBool",
        value: true,
      };
    } else if (current() === TokenType.False) {
      skipToken();

      return {
        type: "LBool",
        value: false,
      };
    } else if (current() === TokenType.Backslash) {
      skipToken();
      const names: Array<string> = [];

      if (current() === TokenType.Identifier) {
        names.push(lexeme());
        skipToken();
      } else {
        throw {
          type: "ParserError",
          token: token(),
          expected: ["identifier"],
        };
      }

      while (current() === TokenType.Identifier) {
        names.push(lexeme());
        skipToken();
      }

      matchToken(TokenType.Arrow);

      const expr = expression();

      return composeLambda(names, expr);
    } else if (current() === TokenType.Let) {
      skipToken();
      const declarations = [declaration()];
      while (current() === TokenType.Semicolon) {
        skipToken();
        declarations.push(declaration());
      }
      matchToken(TokenType.In);
      const expr = expression();

      return {
        type: "Let",
        declarations,
        expr,
      };
    } else if (current() === TokenType.If) {
      skipToken();
      matchToken(TokenType.OpenParen);
      const guard = expression();
      matchToken(TokenType.CloseParen);
      const thenExpr = expression();
      matchToken(TokenType.Else);
      const elseExpr = expression();

      return {
        type: "If",
        guard,
        then: thenExpr,
        else: elseExpr,
      };
    } else {
      throw {
        type: "ParserError",
        token: token(),
        expected: ["identifier", "let", "backslash", "(", "literal-integer"],
      };
    }
  };

  const declaration = (): Declaration => {
    const name = matchToken(TokenType.Identifier);
    const names = [];
    while (current() === TokenType.Identifier) {
      names.push(matchToken(TokenType.Identifier));
    }
    matchToken(TokenType.Equal);
    const expr = expression();

    return {
      type: "Declaration",
      name,
      expr: composeLambda(names, expr),
    };
  };

  return program();
};

const composeLambda = (names: Array<string>, expr: Expression): Expression =>
  names.reduceRight((acc, name) => ({
    type: "Lam",
    name,
    expr: acc,
  }), expr);

// console.log(JSON.stringify(parse("let compose f g x = f(g x) in compose"), null, 2));
