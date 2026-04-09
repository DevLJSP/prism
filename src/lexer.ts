import { Token, TokenType } from './tokens'

const KEYWORDS: Record<string, TokenType> = {
  fn: TokenType.FN,
  final: TokenType.FINAL,
  mut: TokenType.MUT,
  class: TokenType.CLASS,
  pub: TokenType.PUB,
  priv: TokenType.PRIV,
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
}

const TWO_CHAR_TOKENS: Record<string, TokenType> = {
  '=>': TokenType.FAT_ARROW,
  '->': TokenType.ARROW,
  '==': TokenType.EQ_EQ,
  '!=': TokenType.BANG_EQ,
  '>=': TokenType.GTE,
  '<=': TokenType.LTE,
  '&&': TokenType.AND,
  '||': TokenType.OR,
  '??': TokenType.NULLISH,
}

const ONE_CHAR_TOKENS: Record<string, TokenType> = {
  '=': TokenType.EQUALS,
  '+': TokenType.PLUS,
  '-': TokenType.MINUS,
  '*': TokenType.STAR,
  '/': TokenType.SLASH,
  '>': TokenType.GT,
  '<': TokenType.LT,
  '!': TokenType.BANG,
  '(': TokenType.LPAREN,
  ')': TokenType.RPAREN,
  '{': TokenType.LBRACE,
  '}': TokenType.RBRACE,
  '[': TokenType.LBRACKET,
  ']': TokenType.RBRACKET,
  ',': TokenType.COMMA,
  '.': TokenType.DOT,
  ':': TokenType.COLON,
  ';': TokenType.SEMICOLON,
}

export class Lexer {
  private pos = 0
  private line = 1
  private col = 1

  constructor(private readonly source: string) {}

  private peek(offset = 0): string {
    return this.source[this.pos + offset] ?? ''
  }

  private advance(): string {
    const ch = this.source[this.pos++]
    if (ch === '\n') { this.line++; this.col = 1 } else { this.col++ }
    return ch
  }

  private error(msg: string): never {
    throw new Error(`[Prism Lexer] ${msg} at line ${this.line}, col ${this.col}`)
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.peek()
      if (/\s/.test(ch)) { this.advance(); continue }
      // Line comment
      if (ch === '/' && this.peek(1) === '/') {
        while (this.pos < this.source.length && this.peek() !== '\n') this.advance()
        continue
      }
      // Block comment
      if (ch === '/' && this.peek(1) === '*') {
        this.advance(); this.advance()
        while (this.pos < this.source.length) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance(); this.advance(); break
          }
          this.advance()
        }
        continue
      }
      break
    }
  }

  private readString(quote: string): Token {
    const line = this.line, column = this.col
    this.advance() // skip opening quote
    let value = ''
    while (this.pos < this.source.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance()
        const esc = this.advance()
        const escMap: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'" }
        value += escMap[esc] ?? ('\\' + esc)
      } else {
        value += this.advance()
      }
    }
    if (this.pos >= this.source.length) this.error('Unterminated string literal')
    this.advance() // skip closing quote
    return { type: TokenType.STRING_LITERAL, value, line, column }
  }

  private readNumber(): Token {
    const line = this.line, column = this.col
    let value = ''
    while (this.pos < this.source.length && /[0-9.]/.test(this.peek())) {
      value += this.advance()
    }
    return { type: TokenType.NUMBER_LITERAL, value, line, column }
  }

  private readIdentOrKeyword(): Token {
    const line = this.line, column = this.col
    let value = ''
    while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.advance()
    }
    const type = KEYWORDS[value] ?? TokenType.IDENTIFIER
    return { type, value, line, column }
  }

  tokenize(): Token[] {
    const tokens: Token[] = []

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments()
      if (this.pos >= this.source.length) break

      const ch = this.peek()

      if (ch === '"' || ch === "'") {
        tokens.push(this.readString(ch))
        continue
      }

      if (/[0-9]/.test(ch)) {
        tokens.push(this.readNumber())
        continue
      }

      if (/[a-zA-Z_]/.test(ch)) {
        tokens.push(this.readIdentOrKeyword())
        continue
      }

      const line = this.line, column = this.col
      const first = this.advance()
      const two = first + this.peek()

      if (TWO_CHAR_TOKENS[two]) {
        this.advance()
        tokens.push({ type: TWO_CHAR_TOKENS[two], value: two, line, column })
        continue
      }

      if (ONE_CHAR_TOKENS[first]) {
        tokens.push({ type: ONE_CHAR_TOKENS[first], value: first, line, column })
        continue
      }

      // Unknown character — skip with warning
      console.warn(`[Prism Lexer] Unrecognized character '${first}' at ${line}:${column}`)
    }

    tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.col })
    return tokens
  }
}