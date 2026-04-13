import { Token, TokenType } from "./tokens";

const KEYWORDS: Record<string, TokenType> = Object.create(null);

Object.assign(KEYWORDS, {
  fn: TokenType.FN,
  final: TokenType.FINAL,
  mut: TokenType.MUT,
  class: TokenType.CLASS,
  pub: TokenType.PUB,
  priv: TokenType.PRIV,
  static: TokenType.STATIC,
  if: TokenType.IF,
  else: TokenType.ELSE,
  match: TokenType.MATCH,
  shine: TokenType.SHINE,
  shatter: TokenType.SHATTER,
  for: TokenType.FOR,
  in: TokenType.IN,
  while: TokenType.WHILE,
  use: TokenType.USE,
  from: TokenType.FROM,
  new: TokenType.NEW,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  null: TokenType.NULL,
  string: TokenType.STRING,
  int: TokenType.INT,
  float: TokenType.FLOAT,
  bool: TokenType.BOOL,
  void: TokenType.VOID,
  any: TokenType.ANY,
  try: TokenType.TRY,
  catch: TokenType.CATCH,
  do: TokenType.DO,
  break: TokenType.BREAK,
  continue: TokenType.CONTINUE,
  constructor: TokenType.CONSTRUCTOR,
  enum: TokenType.ENUM,
  export: TokenType.EXPORT,
  interface: TokenType.INTERFACE,
  implements: TokenType.IMPLEMENTS,
  extends: TokenType.EXTENDS,
  as: TokenType.AS,
  async: TokenType.ASYNC,
  await: TokenType.AWAIT,
});

const TWO_CHAR_TOKENS: Record<string, TokenType> = {
  "=>": TokenType.FAT_ARROW,
  "**": TokenType.POW,
  "->": TokenType.ARROW,
  "==": TokenType.EQ_EQ,
  "!=": TokenType.BANG_EQ,
  ">=": TokenType.GTE,
  "<=": TokenType.LTE,
  "&&": TokenType.AND,
  "||": TokenType.OR,
  "??": TokenType.NULLISH,
  "+=": TokenType.PLUS_EQ,
  "-=": TokenType.MINUS_EQ,
  "*=": TokenType.STAR_EQ,
  "/=": TokenType.SLASH_EQ,
};

const ONE_CHAR_TOKENS: Record<string, TokenType> = {
  "=": TokenType.EQUALS,
  "%": TokenType.MOD,
  "+": TokenType.PLUS,
  "-": TokenType.MINUS,
  "*": TokenType.STAR,
  "/": TokenType.SLASH,
  ">": TokenType.GT,
  "<": TokenType.LT,
  "!": TokenType.BANG,
  "(": TokenType.LPAREN,
  ")": TokenType.RPAREN,
  "{": TokenType.LBRACE,
  "}": TokenType.RBRACE,
  "[": TokenType.LBRACKET,
  "]": TokenType.RBRACKET,
  ",": TokenType.COMMA,
  ".": TokenType.DOT,
  ":": TokenType.COLON,
  ";": TokenType.SEMICOLON,
};

export class PrismError extends Error {
  constructor(
    public readonly phase: "Lexer" | "Parser" | "Runtime",
    public readonly token: string,
    public readonly line: number,
    public readonly col: number,
    public readonly detail: string,
  ) {
    super(`[${phase}] error at "${token}" (line ${line}, col ${col})\n  ${detail}`);
    this.name = "PrismError";
  }

  format(filename = "<source>"): string {
    return `\nprism: ${filename}:${this.line}:${this.col}: ${this.phase.toLowerCase()} error\n  ${this.detail}\n  near: "${this.token}"\n`;
  }
}

export class Lexer {
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(private readonly source: string) {}

  private peek(offset = 0): string {
    return this.source[this.pos + offset] ?? "";
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private error(token: string, detail: string): never {
    throw new PrismError("Lexer", token, this.line, this.col, detail);
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (/\s/.test(ch)) {
        this.advance();
        continue;
      }
      if (ch === "/" && this.peek(1) === "/") {
        while (this.pos < this.source.length && this.peek() !== "\n") this.advance();
        continue;
      }
      if (ch === "/" && this.peek(1) === "*") {
        this.advance();
        this.advance();
        while (this.pos < this.source.length) {
          if (this.peek() === "*" && this.peek(1) === "/") {
            this.advance();
            this.advance();
            break;
          }
          this.advance();
        }
        continue;
      }
      break;
    }
  }

  private readString(quote: string): Token {
    const line = this.line;
    const column = this.col;
    this.advance();
    let value = "";
    while (this.pos < this.source.length && this.peek() !== quote) {
      if (this.peek() === "\\") {
        this.advance();
        const esc = this.advance();
        const escMap: Record<string, string> = {
          n: "\n", t: "\t", r: "\r",
          "\\": "\\", '"': '"', "'": "'",
        };
        value += escMap[esc] ?? "\\" + esc;
      } else {
        value += this.advance();
      }
    }
    if (this.pos >= this.source.length) {
      this.error(quote, `Unterminated string literal — missing closing ${quote}`);
    }
    this.advance();
    return { type: TokenType.STRING_LITERAL, value, line, column };
  }

  private readNumber(): Token {
    const line = this.line;
    const column = this.col;
    let value = "";
    let dots = 0;
    while (this.pos < this.source.length && /[0-9.]/.test(this.peek())) {
      if (this.peek() === ".") dots++;
      if (dots > 1) this.error(value, "Malformed number — multiple decimal points");
      value += this.advance();
    }
    return { type: TokenType.NUMBER_LITERAL, value, line, column };
  }

  private readIdentOrKeyword(): Token {
    const line = this.line;
    const column = this.col;
    let value = "";
    while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.advance();
    }
    let type = KEYWORDS[value] ?? TokenType.IDENTIFIER;

    if (value === "for") {
      let i = this.pos;
      while (i < this.source.length && /\s/.test(this.source[i])) i++;
      if (this.source[i] === "(") type = TokenType.C_FOR;
    }

    return { type, value, line, column };
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length) break;

      const ch = this.peek();

      if (ch === '"' || ch === "'") {
        tokens.push(this.readString(ch));
        continue;
      }

      if (/[0-9]/.test(ch)) {
        tokens.push(this.readNumber());
        continue;
      }

      if (/[a-zA-Z_]/.test(ch)) {
        tokens.push(this.readIdentOrKeyword());
        continue;
      }

      const line = this.line;
      const column = this.col;
      const first = this.advance();
      const two = first + this.peek();

      if (TWO_CHAR_TOKENS[two]) {
        this.advance();
        tokens.push({ type: TWO_CHAR_TOKENS[two], value: two, line, column });
        continue;
      }

      if (ONE_CHAR_TOKENS[first]) {
        tokens.push({ type: ONE_CHAR_TOKENS[first], value: first, line, column });
        continue;
      }

      this.error(first, `Unrecognized character '${first}'`);
    }

    tokens.push({ type: TokenType.EOF, value: "", line: this.line, column: this.col });
    return tokens;
  }
}