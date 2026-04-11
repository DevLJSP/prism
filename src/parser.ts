import {
  Token,
  TokenType,
  ASTNode,
  Program,
  VariableDeclaration,
  FunctionDeclaration,
  ClassDeclaration,
  MethodDeclaration,
  ConstructorDeclaration,
  EnumDeclaration,
  EnumMember,
  ClassProperty,
  IfStatement,
  MatchStatement,
  MatchCase,
  ReturnStatement,
  ThrowStatement,
  WhileStatement,
  ForStatement,
  ExpressionStatement,
  ImportDeclaration,
  NamedImport,
  ExportDeclaration,
  InterfaceDeclaration,
  InterfaceMethod,
  InterfaceProperty,
  CallExpression,
  MethodCall,
  NewExpression,
  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  BinaryExpression,
  UnaryExpression,
  Assignment,
  CompoundAssignment,
  PropertyAccess,
  IndexAccess,
  ArrayExpression,
  ObjectExpression,
  TryCatchStatement,
  DoWhileStatement,
  CForStatement,
  BreakStatement,
  ContinueStatement,
} from "./tokens";
import { PrismError } from "./lexer";

const TYPE_TOKENS = new Set([
  TokenType.STRING,
  TokenType.INT,
  TokenType.FLOAT,
  TokenType.BOOL,
  TokenType.VOID,
  TokenType.ANY,
  TokenType.IDENTIFIER,
]);

export class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private current(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private peek(offset = 1): Token {
    return this.tokens[this.pos + offset];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private check(...types: TokenType[]): boolean {
    return types.includes(this.current().type);
  }

  private match(...types: TokenType[]): Token | null {
    if (this.check(...types)) return this.advance();
    return null;
  }

  private expect(type: TokenType): Token {
    if (!this.check(type)) {
      const t = this.current();
      throw new PrismError(
        "Parser",
        t.value || type,
        t.line,
        t.column,
        `Expected ${type} but got '${t.value}' (${t.type})`,
      );
    }
    return this.advance();
  }

  private expectIdentifier(context: string): string {
    const tok = this.expect(TokenType.IDENTIFIER);
    if (!tok.value || !tok.value.trim()) {
      throw new PrismError("Parser", tok.value || "IDENTIFIER", tok.line, tok.column, `Empty identifier in ${context}`);
    }
    return tok.value;
  }

  private isTypeToken(): boolean {
    return TYPE_TOKENS.has(this.current().type);
  }

  private parseTypeAnnotation(): string {
    const t = this.advance();

    if (!t.value || !t.value.trim()) {
      throw new PrismError("Parser", t.value || t.type, t.line, t.column, "Invalid type annotation");
    }

    let name = t.value;

    if (this.check(TokenType.LT)) {
      this.advance();
      const args: string[] = [];
      let depth = 1;
      let current = "";
      while (!this.check(TokenType.EOF) && depth > 0) {
        if (this.check(TokenType.LT)) {
          depth++;
          current += "<";
          this.advance();
        } else if (this.check(TokenType.GT)) {
          depth--;
          if (depth > 0) {
            current += ">";
          } else {
            if (current) args.push(current);
          }
          this.advance();
        } else if (this.check(TokenType.COMMA) && depth === 1) {
          if (current) args.push(current.trim());
          current = "";
          this.advance();
        } else {
          current += this.current().value;
          this.advance();
        }
      }
      name += `<${args.join(", ")}>`;
    }

    if (this.check(TokenType.LBRACKET) && this.peek().type === TokenType.RBRACKET) {
      this.advance();
      this.advance();
      name += "[]";
    }

    return name;
  }

  private parseTypeParams(): string[] | undefined {
    if (!this.check(TokenType.LT)) return undefined;
    this.advance();
    const params: string[] = [];
    while (!this.check(TokenType.GT, TokenType.EOF)) {
      const tok = this.current();
      if (tok.type === TokenType.IDENTIFIER || TYPE_TOKENS.has(tok.type)) {
        params.push(this.advance().value);
      } else {
        break;
      }
      this.match(TokenType.COMMA);
    }
    this.expect(TokenType.GT);
    return params.length > 0 ? params : undefined;
  }

  private isPropertyNameToken(type: TokenType): boolean {
    return (
      type === TokenType.IDENTIFIER ||
      type === TokenType.USE ||
      type === TokenType.FN ||
      type === TokenType.FINAL ||
      type === TokenType.MUT ||
      type === TokenType.CLASS ||
      type === TokenType.PUB ||
      type === TokenType.PRIV ||
      type === TokenType.STATIC ||
      type === TokenType.IF ||
      type === TokenType.ELSE ||
      type === TokenType.MATCH ||
      type === TokenType.SHINE ||
      type === TokenType.SHATTER ||
      type === TokenType.FOR ||
      type === TokenType.C_FOR ||
      type === TokenType.IN ||
      type === TokenType.WHILE ||
      type === TokenType.DO ||
      type === TokenType.FROM ||
      type === TokenType.NEW ||
      type === TokenType.TRUE ||
      type === TokenType.FALSE ||
      type === TokenType.NULL ||
      type === TokenType.TRY ||
      type === TokenType.CATCH ||
      type === TokenType.BREAK ||
      type === TokenType.CONTINUE ||
      type === TokenType.CONSTRUCTOR ||
      type === TokenType.ENUM ||
      type === TokenType.EXPORT ||
      type === TokenType.INTERFACE ||
      type === TokenType.IMPLEMENTS ||
      type === TokenType.EXTENDS ||
      type === TokenType.AS
    );
  }

  private expectPropertyName(context: string): string {
    const tok = this.current();
    if (!this.isPropertyNameToken(tok.type)) {
      throw new PrismError(
        "Parser",
        tok.value || tok.type,
        tok.line,
        tok.column,
        `Expected property name in ${context} but got '${tok.value}' (${tok.type})`,
      );
    }
    this.advance();
    return tok.value;
  }

  parse(): Program {
    const body: ASTNode[] = [];
    while (!this.check(TokenType.EOF)) {
      body.push(this.parseStatement());
    }
    return { type: "Program", body };
  }

  private parseStatement(): ASTNode {
    switch (this.current().type) {
      case TokenType.USE:
        return this.parseImport();
      case TokenType.EXPORT:
        return this.parseExport();
      case TokenType.INTERFACE:
        return this.parseInterfaceDeclaration();
      case TokenType.FN:
        return this.parseFunctionDeclaration();
      case TokenType.CLASS:
        return this.parseClassDeclaration();
      case TokenType.ENUM:
        return this.parseEnumDeclaration();
      case TokenType.IF:
        return this.parseIf();
      case TokenType.MATCH:
        return this.parseMatch();
      case TokenType.FOR:
        return this.parseFor();
      case TokenType.WHILE:
        return this.parseWhile();
      case TokenType.SHINE:
        return this.parseReturn();
      case TokenType.DO:
        return this.parseDoWhile();
      case TokenType.C_FOR:
        return this.parseCFor();
      case TokenType.SHATTER:
        return this.parseThrow();
      case TokenType.TRY:
        return this.parseTryCatch();
      case TokenType.BREAK:
        return this.parseBreak();
      case TokenType.CONTINUE:
        return this.parseContinue();
      case TokenType.FINAL:
      case TokenType.MUT:
        return this.parseVarDecl();
      default:
        return this.parseExpressionStatement();
    }
  }

  private parseBreak(): BreakStatement {
    this.expect(TokenType.BREAK);
    this.match(TokenType.SEMICOLON);
    return { type: "BreakStatement" };
  }

  private parseContinue(): ContinueStatement {
    this.expect(TokenType.CONTINUE);
    this.match(TokenType.SEMICOLON);
    return { type: "ContinueStatement" };
  }

  private parseDoWhile(): DoWhileStatement {
    this.expect(TokenType.DO);
    const body = this.parseBlock();
    this.expect(TokenType.WHILE);
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN);
    this.match(TokenType.SEMICOLON);
    return { type: "DoWhileStatement", condition, body };
  }

  private parseCFor(): CForStatement {
    this.expect(TokenType.C_FOR);
    this.expect(TokenType.LPAREN);

    let init: ASTNode | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      if (this.check(TokenType.FINAL, TokenType.MUT)) init = this.parseVarDecl(false);
      else init = this.parseExpression();
    }

    this.expect(TokenType.SEMICOLON);

    let condition: ASTNode | null = null;
    if (!this.check(TokenType.SEMICOLON)) condition = this.parseExpression();

    this.expect(TokenType.SEMICOLON);

    let increment: ASTNode | null = null;
    if (!this.check(TokenType.RPAREN)) increment = this.parseExpression();

    this.expect(TokenType.RPAREN);
    const body = this.parseBlock();
    return { type: "CForStatement", init, condition, increment, body };
  }

  private parseExport(): ExportDeclaration {
    const startTok = this.current();
    this.expect(TokenType.EXPORT);
    let isDefault = false;

    if (this.check(TokenType.IDENTIFIER) && this.current().value === "default") {
      this.advance();
      isDefault = true;
    }

    let declaration: ASTNode;
    switch (this.current().type) {
      case TokenType.FN:
        declaration = this.parseFunctionDeclaration();
        break;
      case TokenType.CLASS:
        declaration = this.parseClassDeclaration();
        break;
      case TokenType.INTERFACE:
        declaration = this.parseInterfaceDeclaration();
        break;
      case TokenType.ENUM:
        declaration = this.parseEnumDeclaration();
        break;
      case TokenType.FINAL:
      case TokenType.MUT:
        declaration = this.parseVarDecl();
        break;
      default: {
        declaration = this.parseExpression();
        this.match(TokenType.SEMICOLON);
      }
    }

    return {
      type: "ExportDeclaration",
      declaration,
      isDefault,
      line: startTok.line,
      col: startTok.column,
    };
  }

  private parseImport(): ImportDeclaration {
    const startTok = this.current();
    this.expect(TokenType.USE);
    let defaultImport: string | undefined;
    let defaultAlias: string | undefined;
    const namedImports: NamedImport[] = [];

    if (this.check(TokenType.LBRACE)) {
      this.advance();
      while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
        const name = this.expectIdentifier("named import");
        let alias: string | undefined;
        if (this.match(TokenType.AS)) {
          alias = this.expectIdentifier("import alias");
        }
        namedImports.push({ name, alias });
        this.match(TokenType.COMMA);
      }
      this.expect(TokenType.RBRACE);
    } else if (this.check(TokenType.IDENTIFIER)) {
      defaultImport = this.expectIdentifier("default import");
      if (this.match(TokenType.AS)) {
        defaultAlias = this.expectIdentifier("default import alias");
      }
    }

    this.expect(TokenType.FROM);
    const path = this.expect(TokenType.STRING_LITERAL).value;
    this.match(TokenType.SEMICOLON);
    return {
      type: "ImportDeclaration",
      defaultImport,
      defaultAlias,
      namedImports,
      path,
      line: startTok.line,
      col: startTok.column,
    };
  }

  private parseVarDecl(consumeSemicolon = true): VariableDeclaration {
    const startTok = this.current();
    const isMutable = this.advance().type === TokenType.MUT;

    let typeAnnotation: string | undefined;
    if (this.isTypeToken() && this.peek().type === TokenType.IDENTIFIER) {
      typeAnnotation = this.parseTypeAnnotation();
    }

    const name = this.expectIdentifier("variable declaration");

    let initializer: ASTNode | undefined;
    if (this.match(TokenType.EQUALS)) {
      initializer = this.parseExpression();
    }

    if (consumeSemicolon) this.match(TokenType.SEMICOLON);

    return {
      type: "VariableDeclaration",
      name,
      typeAnnotation,
      isMutable,
      initializer,
      line: startTok.line,
      col: startTok.column,
    };
  }

  private parseFunctionDeclaration(): FunctionDeclaration {
    const startTok = this.current();
    this.expect(TokenType.FN);
    const name = this.expectIdentifier("function declaration");
    const typeParams = this.parseTypeParams();
    const params = this.parseParamList();

    let returnType: string | undefined;
    if (this.match(TokenType.ARROW)) returnType = this.parseTypeAnnotation();

    const body = this.parseBlock();
    return {
      type: "FunctionDeclaration",
      name,
      typeParams,
      params,
      returnType,
      body,
      line: startTok.line,
      col: startTok.column,
    };
  }

  private parseAnonFunction(): FunctionDeclaration {
    this.expect(TokenType.FN);
    const typeParams = this.parseTypeParams();
    const params = this.parseParamList();

    let returnType: string | undefined;
    if (this.match(TokenType.ARROW)) returnType = this.parseTypeAnnotation();

    const body = this.parseBlock();
    return { type: "FunctionDeclaration", name: "", typeParams, params, returnType, body };
  }

  private parseParamList(): { name: string; typeAnnotation?: string }[] {
    this.expect(TokenType.LPAREN);
    const params: { name: string; typeAnnotation?: string }[] = [];

    while (!this.check(TokenType.RPAREN, TokenType.EOF)) {
      let typeAnnotation: string | undefined;
      if (this.isTypeToken() && this.peek().type === TokenType.IDENTIFIER) {
        typeAnnotation = this.parseTypeAnnotation();
      }
      const paramName = this.expectIdentifier("parameter");
      params.push({ name: paramName, typeAnnotation });
      this.match(TokenType.COMMA);
    }

    this.expect(TokenType.RPAREN);
    return params;
  }

  private parseBlock(): ASTNode[] {
    this.expect(TokenType.LBRACE);
    const stmts: ASTNode[] = [];

    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      stmts.push(this.parseStatement());
    }

    this.expect(TokenType.RBRACE);
    return stmts;
  }

  private parseConstructorDeclaration(): ConstructorDeclaration {
    this.expect(TokenType.CONSTRUCTOR);
    const params = this.parseParamList();
    const body = this.parseBlock();
    return { type: "ConstructorDeclaration", params, body };
  }

  private parseClassDeclaration(): ClassDeclaration {
    const startTok = this.current();
    this.expect(TokenType.CLASS);
    const name = this.expectIdentifier("class declaration");
    const typeParams = this.parseTypeParams();

    let extendsClass: string | undefined;
    if (this.match(TokenType.EXTENDS)) {
      extendsClass = this.expectIdentifier("class extends");
    }

    const implementsInterfaces: string[] = [];
    if (this.match(TokenType.IMPLEMENTS)) {
      implementsInterfaces.push(this.expectIdentifier("implements"));
      while (this.match(TokenType.COMMA)) {
        implementsInterfaces.push(this.expectIdentifier("implements"));
      }
    }

    this.expect(TokenType.LBRACE);

    const methods: MethodDeclaration[] = [];
    const properties: ClassProperty[] = [];
    let ctor: ConstructorDeclaration | undefined;

    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      if (this.check(TokenType.CONSTRUCTOR)) {
        ctor = this.parseConstructorDeclaration();
        continue;
      }

      const visTok = this.match(TokenType.PUB, TokenType.PRIV);
      const visibility: "pub" | "priv" = visTok?.type === TokenType.PRIV ? "priv" : "pub";
      const isStatic = !!this.match(TokenType.STATIC);

      if (this.check(TokenType.FN)) {
        const fn = this.parseFunctionDeclaration();
        methods.push({ ...fn, type: "MethodDeclaration", visibility, isStatic });
      } else {
        const mutTok = this.match(TokenType.FINAL, TokenType.MUT);
        const isMutable = mutTok?.type === TokenType.MUT;

        let typeAnnotation: string | undefined;
        if (this.isTypeToken() && this.peek().type === TokenType.IDENTIFIER) {
          typeAnnotation = this.parseTypeAnnotation();
        }

        const propName = this.expectIdentifier("class property");

        let initializer: ASTNode | undefined;
        if (this.match(TokenType.EQUALS)) {
          initializer = this.parseExpression();
        }

        this.match(TokenType.SEMICOLON);
        properties.push({ name: propName, typeAnnotation, visibility, initializer, isMutable });
      }
    }

    this.expect(TokenType.RBRACE);
    return {
      type: "ClassDeclaration",
      name,
      typeParams,
      extendsClass,
      implementsInterfaces,
      methods,
      properties,
      constructor: ctor,
      line: startTok.line,
      col: startTok.column,
    };
  }

  private parseInterfaceDeclaration(): InterfaceDeclaration {
    const startTok = this.current();
    this.expect(TokenType.INTERFACE);
    const name = this.expectIdentifier("interface declaration");
    const typeParams = this.parseTypeParams();

    const extendsInterfaces: string[] = [];
    if (this.match(TokenType.EXTENDS)) {
      extendsInterfaces.push(this.expectIdentifier("interface extends"));
      while (this.match(TokenType.COMMA)) {
        extendsInterfaces.push(this.expectIdentifier("interface extends"));
      }
    }

    this.expect(TokenType.LBRACE);
    const methods: InterfaceMethod[] = [];
    const properties: InterfaceProperty[] = [];

    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      if (this.check(TokenType.FN)) {
        this.advance();
        const methodName = this.expectIdentifier("interface method");
        const methodTypeParams = this.parseTypeParams();
        const params = this.parseParamList();
        let returnType: string | undefined;
        if (this.match(TokenType.ARROW)) returnType = this.parseTypeAnnotation();
        this.match(TokenType.SEMICOLON);
        methods.push({ name: methodName, typeParams: methodTypeParams, params, returnType });
      } else {
        const propName = this.expectIdentifier("interface property");
        let typeAnnotation: string | undefined;
        if (this.isTypeToken()) {
          typeAnnotation = this.parseTypeAnnotation();
        }
        this.match(TokenType.SEMICOLON);
        properties.push({ name: propName, typeAnnotation });
      }
    }

    this.expect(TokenType.RBRACE);
    return {
      type: "InterfaceDeclaration",
      name,
      typeParams,
      extendsInterfaces: extendsInterfaces.length > 0 ? extendsInterfaces : undefined,
      methods,
      properties,
      line: startTok.line,
      col: startTok.column,
    };
  }

  private parseEnumDeclaration(): EnumDeclaration {
    const startTok = this.current();
    this.expect(TokenType.ENUM);
    const name = this.expectIdentifier("enum declaration");
    this.expect(TokenType.LBRACE);

    const members: EnumMember[] = [];

    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      const memberName = this.expectIdentifier("enum member");
      let initializer: ASTNode | undefined;
      if (this.match(TokenType.EQUALS)) {
        initializer = this.parseExpression();
      }
      members.push({ name: memberName, initializer });
      this.match(TokenType.COMMA);
    }

    this.expect(TokenType.RBRACE);
    return { type: "EnumDeclaration", name, members, line: startTok.line, col: startTok.column };
  }

  private parseIf(): IfStatement {
    this.expect(TokenType.IF);
    const condition = this.parseExpression();
    const thenBranch = this.parseBlock();

    let elseBranch: ASTNode[] | undefined;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.check(TokenType.IF) ? [this.parseIf()] : this.parseBlock();
    }

    return { type: "IfStatement", condition, thenBranch, elseBranch };
  }

  private parseMatch(): MatchStatement {
    this.expect(TokenType.MATCH);
    const expression = this.parseExpression();
    this.expect(TokenType.LBRACE);
    const cases: MatchCase[] = [];

    while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
      let pattern: MatchCase["pattern"];
      const t = this.current();

      if (t.type === TokenType.IDENTIFIER && t.value === "_") {
        this.advance();
        pattern = "default";
      } else if (t.type === TokenType.STRING_LITERAL) {
        pattern = this.advance().value;
      } else if (t.type === TokenType.NUMBER_LITERAL) {
        pattern = parseFloat(this.advance().value);
      } else if (t.type === TokenType.TRUE) {
        this.advance();
        pattern = true;
      } else if (t.type === TokenType.FALSE) {
        this.advance();
        pattern = false;
      } else {
        pattern = this.advance().value;
      }

      this.expect(TokenType.FAT_ARROW);
      const body = this.check(TokenType.LBRACE) ? this.parseBlock() : [this.parseStatement()];

      cases.push({ pattern, body });
      this.match(TokenType.COMMA);
    }

    this.expect(TokenType.RBRACE);
    return { type: "MatchStatement", expression, cases };
  }

  private parseFor(): ForStatement {
    this.expect(TokenType.FOR);
    const variable = this.expectIdentifier("for-in loop");
    this.expect(TokenType.IN);
    const iterable = this.parseExpression();
    const body = this.parseBlock();
    return { type: "ForStatement", variable, iterable, body };
  }

  private parseWhile(): WhileStatement {
    this.expect(TokenType.WHILE);
    const condition = this.parseExpression();
    const body = this.parseBlock();
    return { type: "WhileStatement", condition, body };
  }

  private parseReturn(): ReturnStatement {
    const startTok = this.current();
    this.expect(TokenType.SHINE);
    let value: ASTNode | undefined;

    if (!this.check(TokenType.SEMICOLON, TokenType.RBRACE, TokenType.EOF)) {
      value = this.parseExpression();
    }

    this.match(TokenType.SEMICOLON);
    return { type: "ReturnStatement", value, line: startTok.line };
  }

  private parseThrow(): ThrowStatement {
    this.expect(TokenType.SHATTER);
    const expression = this.parseExpression();
    this.match(TokenType.SEMICOLON);
    return { type: "ThrowStatement", expression };
  }

  private parseTryCatch(): TryCatchStatement {
    this.expect(TokenType.TRY);
    const tryBody = this.parseBlock();
    this.expect(TokenType.CATCH);
    this.expect(TokenType.LPAREN);
    const catchVar = this.expectIdentifier("catch clause");
    this.expect(TokenType.RPAREN);
    const catchBody = this.parseBlock();
    return { type: "TryCatchStatement", tryBody, catchVar, catchBody };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const startTok = this.current();
    const expression = this.parseExpression();
    this.match(TokenType.SEMICOLON);
    return { type: "ExpressionStatement", expression, line: startTok.line };
  }

  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const expr = this.parseNullish();

    if (this.check(TokenType.PLUS_EQ, TokenType.MINUS_EQ, TokenType.STAR_EQ, TokenType.SLASH_EQ)) {
      const op = this.advance().value;
      const value = this.parseAssignment();
      return { type: "CompoundAssignment", operator: op, target: expr, value } as CompoundAssignment;
    }

    if (this.match(TokenType.EQUALS)) {
      const value = this.parseAssignment();
      return { type: "Assignment", target: expr, value } as Assignment;
    }

    return expr;
  }

  private parseBinary(next: () => ASTNode, ...ops: TokenType[]): ASTNode {
    let left = next.call(this);

    while (this.check(...ops)) {
      const op = this.advance().value;
      left = { type: "BinaryExpression", operator: op, left, right: next.call(this) } as BinaryExpression;
    }

    return left;
  }

  private parseNullish(): ASTNode {
    return this.parseBinary(this.parseOr, TokenType.NULLISH);
  }

  private parseOr(): ASTNode {
    return this.parseBinary(this.parseAnd, TokenType.OR);
  }

  private parseAnd(): ASTNode {
    return this.parseBinary(this.parseEquality, TokenType.AND);
  }

  private parseEquality(): ASTNode {
    return this.parseBinary(this.parseRelational, TokenType.EQ_EQ, TokenType.BANG_EQ);
  }

  private parseRelational(): ASTNode {
    return this.parseBinary(this.parseAddSub, TokenType.GT, TokenType.LT, TokenType.GTE, TokenType.LTE);
  }

  private parseAddSub(): ASTNode {
    return this.parseBinary(this.parseMulDiv, TokenType.PLUS, TokenType.MINUS);
  }

  private parsePow(): ASTNode {
    let left = this.parseUnary();

    while (this.match(TokenType.POW)) {
      const op = this.previous().value;
      const right = this.parseUnary();
      left = { type: "BinaryExpression", operator: op, left, right } as BinaryExpression;
    }

    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parsePow();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.MOD)) {
      const op = this.previous().value;
      const right = this.parsePow();
      left = { type: "BinaryExpression", operator: op, left, right } as BinaryExpression;
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.check(TokenType.BANG, TokenType.MINUS)) {
      const op = this.advance().value;
      return { type: "UnaryExpression", operator: op, operand: this.parseUnary() } as UnaryExpression;
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.DOT)) {
        const prop = this.expectPropertyName("property access");

        if (this.check(TokenType.LPAREN)) {
          const args = this.parseArgList();
          expr = { type: "MethodCall", object: expr, method: prop, args } as MethodCall;
        } else {
          expr = { type: "PropertyAccess", object: expr, property: prop } as PropertyAccess;
        }
      } else if (this.check(TokenType.LBRACKET)) {
        this.advance();
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET);
        expr = { type: "IndexAccess", object: expr, index } as IndexAccess;
      } else if (this.check(TokenType.LPAREN) && expr.type === "Identifier") {
        const args = this.parseArgList();
        expr = { type: "CallExpression", callee: (expr as Identifier).name, args } as CallExpression;
      } else {
        break;
      }
    }

    return expr;
  }

  private isArrowFunctionStart(): boolean {
    if (!this.check(TokenType.LPAREN)) return false;

    let depth = 0;
    let i = this.pos;

    while (i < this.tokens.length) {
      const tok = this.tokens[i];
      if (tok.type === TokenType.LPAREN) depth++;
      else if (tok.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          return this.tokens[i + 1]?.type === TokenType.FAT_ARROW;
        }
      }
      i++;
    }

    return false;
  }

  private parseParenArrowFunction(): FunctionDeclaration {
    this.expect(TokenType.LPAREN);
    const params: { name: string; typeAnnotation?: string }[] = [];

    while (!this.check(TokenType.RPAREN, TokenType.EOF)) {
      let typeAnnotation: string | undefined;
      if (this.isTypeToken() && this.peek().type === TokenType.IDENTIFIER) {
        typeAnnotation = this.parseTypeAnnotation();
      }
      const paramName = this.expectIdentifier("anonymous function parameter");
      params.push({ name: paramName, typeAnnotation });
      this.match(TokenType.COMMA);
    }

    this.expect(TokenType.RPAREN);

    if (!this.match(TokenType.FAT_ARROW)) {
      const t = this.current();
      throw new PrismError("Parser", t.value || t.type, t.line, t.column, `Expected FAT_ARROW but got '${t.value}' (${t.type})`);
    }

    const body = this.parseBlock();
    return { type: "FunctionDeclaration", name: "", params, returnType: undefined, body };
  }

  private parseArgList(): ASTNode[] {
    this.expect(TokenType.LPAREN);
    const args: ASTNode[] = [];

    while (!this.check(TokenType.RPAREN, TokenType.EOF)) {
      if (this.check(TokenType.FN)) {
        args.push(this.parseAnonFunction());
      } else {
        args.push(this.parseExpression());
      }
      this.match(TokenType.COMMA);
    }

    this.expect(TokenType.RPAREN);
    return args;
  }

  private parsePrimary(): ASTNode {
    const t = this.current();

    switch (t.type) {
      case TokenType.NUMBER_LITERAL:
        this.advance();
        return { type: "NumberLiteral", value: parseFloat(t.value) } as NumberLiteral;

      case TokenType.STRING_LITERAL:
        this.advance();
        return { type: "StringLiteral", value: t.value } as StringLiteral;

      case TokenType.TRUE:
        this.advance();
        return { type: "BooleanLiteral", value: true } as BooleanLiteral;

      case TokenType.FALSE:
        this.advance();
        return { type: "BooleanLiteral", value: false } as BooleanLiteral;

      case TokenType.NULL:
        this.advance();
        return { type: "NullLiteral", value: null } as NullLiteral;

      case TokenType.NEW: {
        this.advance();
        const className = this.expectIdentifier("new expression");
        const args = this.parseArgList();
        return { type: "NewExpression", className, args } as NewExpression;
      }

      case TokenType.FN:
        return this.parseAnonFunction();

      case TokenType.LBRACKET: {
        this.advance();
        const elements: ASTNode[] = [];
        while (!this.check(TokenType.RBRACKET, TokenType.EOF)) {
          elements.push(this.parseExpression());
          this.match(TokenType.COMMA);
        }
        this.expect(TokenType.RBRACKET);
        return { type: "ArrayExpression", elements } as ArrayExpression;
      }

      case TokenType.LBRACE: {
        this.advance();
        const properties: { key: string; value: ASTNode }[] = [];
        while (!this.check(TokenType.RBRACE, TokenType.EOF)) {
          const keyTok = this.check(TokenType.STRING_LITERAL)
            ? this.advance()
            : { ...this.current(), value: this.expectPropertyName("object key") };

          if (!keyTok.value || !keyTok.value.trim()) {
            throw new PrismError("Parser", keyTok.value || keyTok.type, keyTok.line, keyTok.column, "Empty object key");
          }

          this.expect(TokenType.COLON);
          const value = this.parseExpression();
          properties.push({ key: keyTok.value, value });
          this.match(TokenType.COMMA);
        }
        this.expect(TokenType.RBRACE);
        return { type: "ObjectExpression", properties } as ObjectExpression;
      }

      case TokenType.LPAREN: {
        if (this.isArrowFunctionStart()) {
          return this.parseParenArrowFunction();
        }
        this.advance();
        const inner = this.parseExpression();
        this.expect(TokenType.RPAREN);
        return inner;
      }

      case TokenType.IDENTIFIER:
        this.advance();
        if (!t.value || !t.value.trim()) {
          throw new PrismError("Parser", t.value || t.type, t.line, t.column, "Empty identifier");
        }
        return { type: "Identifier", name: t.value } as Identifier;

      default:
        throw new PrismError(
          "Parser",
          t.value || t.type,
          t.line,
          t.column,
          `Unexpected token '${t.value}' (${t.type}) — expected an expression`,
        );
    }
  }
}