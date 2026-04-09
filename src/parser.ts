import {
  Token, TokenType, ASTNode, Program, VariableDeclaration, FunctionDeclaration,
  ClassDeclaration, MethodDeclaration, ClassProperty, IfStatement, MatchStatement,
  MatchCase, ReturnStatement, ThrowStatement, WhileStatement, ForStatement,
  ExpressionStatement, ImportDeclaration, CallExpression, MethodCall, NewExpression,
  Identifier, StringLiteral, NumberLiteral, BooleanLiteral, NullLiteral,
  BinaryExpression, UnaryExpression, Assignment, PropertyAccess, IndexAccess,
  ArrayExpression, ObjectExpression,
} from './tokens'

const TYPE_TOKENS = new Set([
  TokenType.STRING, TokenType.INT, TokenType.FLOAT,
  TokenType.BOOL, TokenType.VOID, TokenType.ANY, TokenType.IDENTIFIER,
])

export class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private current(): Token { return this.tokens[this.pos] }
  private peek(offset = 1): Token { return this.tokens[this.pos + offset] }
  private advance(): Token { return this.tokens[this.pos++] }

  private check(...types: TokenType[]): boolean {
    return types.includes(this.current().type)
  }

  private match(...types: TokenType[]): Token | null {
    if (this.check(...types)) return this.advance()
    return null
  }

  private expect(type: TokenType): Token {
    if (!this.check(type)) {
      const t = this.current()
      throw new Error(
        `[Prism Parser] Expected ${type} but got '${t.value}' (${t.type}) at ${t.line}:${t.column}`
      )
    }
    return this.advance()
  }

  private isTypeToken(): boolean {
    return TYPE_TOKENS.has(this.current().type)
  }

  /** Parse a type annotation, e.g. string, int, bool, User, string[] */
  private parseTypeAnnotation(): string {
    const t = this.advance()
    let name = t.value
    // Array type: type[]
    if (this.check(TokenType.LBRACKET) && this.peek().type === TokenType.RBRACKET) {
      this.advance(); this.advance()
      name += '[]'
    }
    return name
  }

  // ─── Top Level ─────────────────────────────────────────────────────────────

  parse(): Program {
    const body: ASTNode[] = []
    while (!this.check(TokenType.EOF)) {
      body.push(this.parseStatement())
    }
    return { type: 'Program', body }
  }

  // ─── Statements ────────────────────────────────────────────────────────────

  private parseStatement(): ASTNode {
    switch (this.current().type) {
      case TokenType.USE:     return this.parseImport()
      case TokenType.FN:      return this.parseFunctionDeclaration()
      case TokenType.CLASS:   return this.parseClassDeclaration()
      case TokenType.IF:      return this.parseIf()
      case TokenType.MATCH:   return this.parseMatch()
      case TokenType.FOR:     return this.parseFor()
      case TokenType.WHILE:   return this.parseWhile()
      case TokenType.SHINE:   return this.parseReturn()
      case TokenType.SHATTER: return this.parseThrow()
      case TokenType.FINAL:
      case TokenType.MUT:     return this.parseVarDecl()
      default:
        return this.parseExpressionStatement()
    }
  }

  private parseImport(): ImportDeclaration {
    this.expect(TokenType.USE)
    let defaultImport: string | undefined
    const namedImports: string[] = []

    if (this.check(TokenType.LBRACE)) {
      this.advance()
      while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
        namedImports.push(this.expect(TokenType.IDENTIFIER).value)
        this.match(TokenType.COMMA)
      }
      this.expect(TokenType.RBRACE)
    } else if (this.check(TokenType.IDENTIFIER)) {
      defaultImport = this.advance().value
    }

    this.expect(TokenType.FROM)
    const path = this.expect(TokenType.STRING_LITERAL).value
    this.match(TokenType.SEMICOLON)
    return { type: 'ImportDeclaration', defaultImport, namedImports, path }
  }

  private parseVarDecl(): VariableDeclaration {
    const isMutable = this.advance().type === TokenType.MUT
    // Optional type annotation before name
    let typeAnnotation: string | undefined
    if (this.isTypeToken() && this.peek().type === TokenType.IDENTIFIER) {
      typeAnnotation = this.parseTypeAnnotation()
    }
    const name = this.expect(TokenType.IDENTIFIER).value
    let initializer: ASTNode | undefined
    if (this.match(TokenType.EQUALS)) {
      initializer = this.parseExpression()
    }
    this.match(TokenType.SEMICOLON)
    return { type: 'VariableDeclaration', name, typeAnnotation, isMutable, initializer }
  }

  private parseFunctionDeclaration(): FunctionDeclaration {
    this.expect(TokenType.FN)
    const name = this.expect(TokenType.IDENTIFIER).value
    const params = this.parseParamList()
    let returnType: string | undefined
    if (this.match(TokenType.ARROW)) returnType = this.parseTypeAnnotation()
    const body = this.parseBlock()
    return { type: 'FunctionDeclaration', name, params, returnType, body }
  }

  private parseParamList(): { name: string; typeAnnotation?: string }[] {
    this.expect(TokenType.LPAREN)
    const params: { name: string; typeAnnotation?: string }[] = []
    while (!this.check(TokenType.RPAREN, TokenType.EOF)) {
      let typeAnnotation: string | undefined
      if (this.isTypeToken() && this.peek().type === TokenType.IDENTIFIER) {
        typeAnnotation = this.parseTypeAnnotation()
      }
      const paramName = this.expect(TokenType.IDENTIFIER).value
      params.push({ name: paramName, typeAnnotation })
      this.match(TokenType.COMMA)
    }
    this.expect(TokenType.RPAREN)
    return params
  }

  private parseBlock(): ASTNode[] {
    this.expect(TokenType.LBRACE)
    const stmts: ASTNode[] = []
    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      stmts.push(this.parseStatement())
    }
    this.expect(TokenType.RBRACE)
    return stmts
  }

  private parseClassDeclaration(): ClassDeclaration {
    this.expect(TokenType.CLASS)
    const name = this.expect(TokenType.IDENTIFIER).value
    this.expect(TokenType.LBRACE)

    const methods: MethodDeclaration[] = []
    const properties: ClassProperty[] = []

    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      const visTok = this.match(TokenType.PUB, TokenType.PRIV)
      const visibility: 'pub' | 'priv' = visTok?.type === TokenType.PRIV ? 'priv' : 'pub'

      if (this.check(TokenType.FN)) {
        const fn = this.parseFunctionDeclaration()
        methods.push({ ...fn, type: 'MethodDeclaration', visibility })
      } else {
        // Property declaration
        let typeAnnotation: string | undefined
        if (this.isTypeToken() && this.peek().type === TokenType.IDENTIFIER) {
          typeAnnotation = this.parseTypeAnnotation()
        }
        const propName = this.expect(TokenType.IDENTIFIER).value
        let initializer: ASTNode | undefined
        if (this.match(TokenType.EQUALS)) {
          initializer = this.parseExpression()
        }
        this.match(TokenType.SEMICOLON)
        properties.push({ name: propName, typeAnnotation, visibility, initializer })
      }
    }

    this.expect(TokenType.RBRACE)
    return { type: 'ClassDeclaration', name, methods, properties }
  }

  private parseIf(): IfStatement {
    this.expect(TokenType.IF)
    const condition = this.parseExpression()
    const thenBranch = this.parseBlock()
    let elseBranch: ASTNode[] | undefined
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.check(TokenType.IF) ? [this.parseIf()] : this.parseBlock()
    }
    return { type: 'IfStatement', condition, thenBranch, elseBranch }
  }

  private parseMatch(): MatchStatement {
    this.expect(TokenType.MATCH)
    const expression = this.parseExpression()
    this.expect(TokenType.LBRACE)
    const cases: MatchCase[] = []

    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      let pattern: MatchCase['pattern']
      const t = this.current()

      if (t.type === TokenType.IDENTIFIER && t.value === '_') {
        this.advance(); pattern = 'default'
      } else if (t.type === TokenType.STRING_LITERAL) {
        pattern = this.advance().value
      } else if (t.type === TokenType.NUMBER_LITERAL) {
        pattern = parseFloat(this.advance().value)
      } else if (t.type === TokenType.TRUE) {
        this.advance(); pattern = true
      } else if (t.type === TokenType.FALSE) {
        this.advance(); pattern = false
      } else {
        pattern = this.advance().value
      }

      this.expect(TokenType.FAT_ARROW)
      const body = this.check(TokenType.LBRACE) ? this.parseBlock() : [this.parseStatement()]
      cases.push({ pattern, body })
      this.match(TokenType.COMMA)
    }

    this.expect(TokenType.RBRACE)
    return { type: 'MatchStatement', expression, cases }
  }

  private parseFor(): ForStatement {
    this.expect(TokenType.FOR)
    const variable = this.expect(TokenType.IDENTIFIER).value
    this.expect(TokenType.IN)
    const iterable = this.parseExpression()
    const body = this.parseBlock()
    return { type: 'ForStatement', variable, iterable, body }
  }

  private parseWhile(): WhileStatement {
    this.expect(TokenType.WHILE)
    const condition = this.parseExpression()
    const body = this.parseBlock()
    return { type: 'WhileStatement', condition, body }
  }

  private parseReturn(): ReturnStatement {
    this.expect(TokenType.SHINE)
    let value: ASTNode | undefined
    if (!this.check(TokenType.SEMICOLON, TokenType.RBRACE, TokenType.EOF)) {
      value = this.parseExpression()
    }
    this.match(TokenType.SEMICOLON)
    return { type: 'ReturnStatement', value }
  }

  private parseThrow(): ThrowStatement {
    this.expect(TokenType.SHATTER)
    const expression = this.parseExpression()
    this.match(TokenType.SEMICOLON)
    return { type: 'ThrowStatement', expression }
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expression = this.parseExpression()
    this.match(TokenType.SEMICOLON)
    return { type: 'ExpressionStatement', expression }
  }

  // ─── Expressions (Pratt-style precedence) ──────────────────────────────────

  private parseExpression(): ASTNode { return this.parseAssignment() }

  private parseAssignment(): ASTNode {
    const expr = this.parseNullish()
    if (this.match(TokenType.EQUALS)) {
      const value = this.parseAssignment()
      return { type: 'Assignment', target: expr, value } as Assignment
    }
    return expr
  }

  private parseBinary(
    next: () => ASTNode,
    ...ops: TokenType[]
  ): ASTNode {
    let left = next.call(this)
    while (this.check(...ops)) {
      const op = this.advance().value
      left = { type: 'BinaryExpression', operator: op, left, right: next.call(this) } as BinaryExpression
    }
    return left
  }

  private parseNullish(): ASTNode  { return this.parseBinary(this.parseOr, TokenType.NULLISH) }
  private parseOr(): ASTNode       { return this.parseBinary(this.parseAnd, TokenType.OR) }
  private parseAnd(): ASTNode      { return this.parseBinary(this.parseEquality, TokenType.AND) }
  private parseEquality(): ASTNode { return this.parseBinary(this.parseRelational, TokenType.EQ_EQ, TokenType.BANG_EQ) }
  private parseRelational(): ASTNode { return this.parseBinary(this.parseAddSub, TokenType.GT, TokenType.LT, TokenType.GTE, TokenType.LTE) }
  private parseAddSub(): ASTNode   { return this.parseBinary(this.parseMulDiv, TokenType.PLUS, TokenType.MINUS) }
  private parseMulDiv(): ASTNode   { return this.parseBinary(this.parseUnary, TokenType.STAR, TokenType.SLASH) }

  private parseUnary(): ASTNode {
    if (this.check(TokenType.BANG, TokenType.MINUS)) {
      const op = this.advance().value
      return { type: 'UnaryExpression', operator: op, operand: this.parseUnary() } as UnaryExpression
    }
    return this.parsePostfix()
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary()

    while (true) {
      if (this.match(TokenType.DOT)) {
        const prop = this.expect(TokenType.IDENTIFIER).value
        if (this.check(TokenType.LPAREN)) {
          const args = this.parseArgList()
          expr = { type: 'MethodCall', object: expr, method: prop, args } as MethodCall
        } else {
          expr = { type: 'PropertyAccess', object: expr, property: prop } as PropertyAccess
        }
      } else if (this.check(TokenType.LBRACKET)) {
        this.advance()
        const index = this.parseExpression()
        this.expect(TokenType.RBRACKET)
        expr = { type: 'IndexAccess', object: expr, index } as IndexAccess
      } else if (this.check(TokenType.LPAREN) && expr.type === 'Identifier') {
        const args = this.parseArgList()
        expr = { type: 'CallExpression', callee: (expr as Identifier).name, args } as CallExpression
      } else {
        break
      }
    }

    return expr
  }

  private parseArgList(): ASTNode[] {
    this.expect(TokenType.LPAREN)
    const args: ASTNode[] = []
    while (!this.check(TokenType.RPAREN, TokenType.EOF)) {
      args.push(this.parseExpression())
      this.match(TokenType.COMMA)
    }
    this.expect(TokenType.RPAREN)
    return args
  }

  private parsePrimary(): ASTNode {
    const t = this.current()

    switch (t.type) {
      case TokenType.NUMBER_LITERAL:
        this.advance()
        return { type: 'NumberLiteral', value: parseFloat(t.value) } as NumberLiteral

      case TokenType.STRING_LITERAL:
        this.advance()
        return { type: 'StringLiteral', value: t.value } as StringLiteral

      case TokenType.TRUE:
        this.advance()
        return { type: 'BooleanLiteral', value: true } as BooleanLiteral

      case TokenType.FALSE:
        this.advance()
        return { type: 'BooleanLiteral', value: false } as BooleanLiteral

      case TokenType.NULL:
        this.advance()
        return { type: 'NullLiteral', value: null } as NullLiteral

      case TokenType.NEW: {
        this.advance()
        const className = this.expect(TokenType.IDENTIFIER).value
        const args = this.parseArgList()
        return { type: 'NewExpression', className, args } as NewExpression
      }

      case TokenType.LBRACKET: {
        this.advance()
        const elements: ASTNode[] = []
        while (!this.check(TokenType.RBRACKET, TokenType.EOF)) {
          elements.push(this.parseExpression())
          this.match(TokenType.COMMA)
        }
        this.expect(TokenType.RBRACKET)
        return { type: 'ArrayExpression', elements } as ArrayExpression
      }

      case TokenType.LBRACE: {
        this.advance()
        const properties: { key: string; value: ASTNode }[] = []
        while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
          const key = this.expect(TokenType.IDENTIFIER).value
          this.expect(TokenType.COLON)
          const value = this.parseExpression()
          properties.push({ key, value })
          this.match(TokenType.COMMA)
        }
        this.expect(TokenType.RBRACE)
        return { type: 'ObjectExpression', properties } as ObjectExpression
      }

      case TokenType.LPAREN: {
        this.advance()
        const inner = this.parseExpression()
        this.expect(TokenType.RPAREN)
        return inner
      }

      case TokenType.IDENTIFIER:
        this.advance()
        return { type: 'Identifier', name: t.value } as Identifier

      default:
        throw new Error(
          `[Prism Parser] Unexpected token '${t.value}' (${t.type}) at ${t.line}:${t.column}`
        )
    }
  }
}