const tokenRegExp =
  /->|==|(--.*)|[\\()=+\\-\\*\\/;\n]|([A-Za-z]\w*)|(\d+)|([!-~]+)/g;

export enum TokenType {
  OpenParen,
  CloseParen,
  Semicolon,
  Equal,
  EqualEqual,
  Plus,
  Minus,
  Star,
  Slash,
  Arrow,
  Def,
  Else,
  If,
  In,
  Let,
  True,
  False,
  Backslash,
  Identifier,
  LiteralInt,
  Error,
}

export type Token = {
  lexeme: string;
  type: TokenType;
  position: { row: number; col: number };
};

type TokenMap = {
  [key: string]: TokenType;
};

const tokenMap: TokenMap = {
  "(": TokenType.OpenParen,
  ")": TokenType.CloseParen,
  ";": TokenType.Semicolon,
  "=": TokenType.Equal,
  "==": TokenType.EqualEqual,
  "+": TokenType.Plus,
  "-": TokenType.Minus,
  "*": TokenType.Star,
  "/": TokenType.Slash,
  "->": TokenType.Arrow,
  "else": TokenType.Else,
  "def": TokenType.Def,
  "if": TokenType.If,
  "in": TokenType.In,
  "let": TokenType.Let,
  "True": TokenType.True,
  "False": TokenType.False,
  "\\": TokenType.Backslash,
};

export const scanner = (input: string) => {
  let row = 0, col = 0;
  const tokens: Array<Token> = [];
  let match = tokenRegExp.exec(input);
  while (match) {
    let type: TokenType | undefined = undefined;

    if (tokenMap[match[0]] !== undefined) {
      type = tokenMap[match[0]];
    } else if (match[1]) {
      type = undefined;
    } else if (match[2]) {
      type = TokenType.Identifier;
    } else if (match[3]) {
      type = TokenType.LiteralInt;
    } else if (match[4]) {
      type = TokenType.Error;
    }

    if (type !== undefined) {
      tokens.push({
        lexeme: match[0],
        type,
        position: { row, col },
      });
    }

    if (match[0] === "\n") {
      row++;
      col = 0;
    } else {
      col += match[0].length;
    }

    match = tokenRegExp.exec(input);
  }

  return tokens;
};

// console.log(scanner("abc ( 123 else ) -- hello world $$\nx"));
