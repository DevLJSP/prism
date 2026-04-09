export enum TokenType {
  // === PRISM KEYWORDS ===
  FN = 'FN',
  FINAL = 'FINAL',
  MUT = 'MUT',
  CLASS = 'CLASS',
  PUB = 'PUB',
  PRIV = 'PRIV',
  IF = 'IF',
  ELSE = 'ELSE',
  MATCH = 'MATCH',
  SHINE = 'SHINE',
  SHATTER = 'SHATTER',
  FOR = 'FOR',
  IN = 'IN',
  WHILE = 'WHILE',
  USE = 'USE',
  FROM = 'FROM',
  NEW = 'NEW',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  TRY = 'TRY',
  CATCH = 'CATCH',

  // === TYPES ===
  STRING = 'STRING',
  INT = 'INT',
  FLOAT = 'FLOAT',
  BOOL = 'BOOL',
  VOID = 'VOID',
  ANY = 'ANY',

  // === IDENTIFIERS & LITERALS ===
  IDENTIFIER = 'IDENTIFIER',
  STRING_LITERAL = 'STRING_LITERAL',
  NUMBER_LITERAL = 'NUMBER_LITERAL',

  // === OPERATORS ===
  EQUALS = 'EQUALS',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  EQ_EQ = 'EQ_EQ',
  BANG_EQ = 'BANG_EQ',
  GT = 'GT',
  LT = 'LT',
  GTE = 'GTE',
  LTE = 'LTE',
  BANG = 'BANG',
  AND = 'AND',
  OR = 'OR',
  ARROW = 'ARROW',
  FAT_ARROW = 'FAT_ARROW',
  NULLISH = 'NULLISH',

  // === COMPOUND ASSIGNMENT ===
  PLUS_EQ = 'PLUS_EQ',
  MINUS_EQ = 'MINUS_EQ',
  STAR_EQ = 'STAR_EQ',
  SLASH_EQ = 'SLASH_EQ',

  // === PUNCTUATORS ===
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',

  // === SPECIAL ===
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// AST Node Types

export type ASTNode =
  | Program
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration
  | MethodDeclaration
  | CallExpression
  | MethodCall
  | NewExpression
  | Identifier
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | NullLiteral
  | BinaryExpression
  | UnaryExpression
  | Assignment
  | CompoundAssignment
  | IfStatement
  | MatchStatement
  | ReturnStatement
  | ExpressionStatement
  | ImportDeclaration
  | PropertyAccess
  | IndexAccess
  | ArrayExpression
  | ObjectExpression
  | ThrowStatement
  | WhileStatement
  | ForStatement
  | TryCatchStatement;

export interface Program {
  type: 'Program';
  body: ASTNode[];
}

export interface VariableDeclaration {
  type: 'VariableDeclaration';
  name: string;
  typeAnnotation?: string;
  isMutable: boolean;
  initializer?: ASTNode;
}

export interface FunctionDeclaration {
  type: 'FunctionDeclaration';
  name: string;
  params: { name: string; typeAnnotation?: string }[];
  returnType?: string;
  body: ASTNode[];
}

export interface ClassDeclaration {
  type: 'ClassDeclaration';
  name: string;
  methods: MethodDeclaration[];
  properties: ClassProperty[];
}

export interface ClassProperty {
  name: string;
  typeAnnotation?: string;
  visibility: 'pub' | 'priv';
  initializer?: ASTNode;
}

export interface MethodDeclaration {
  type: 'MethodDeclaration';
  name: string;
  params: { name: string; typeAnnotation?: string }[];
  returnType?: string;
  visibility: 'pub' | 'priv';
  body: ASTNode[];
}

export interface CallExpression {
  type: 'CallExpression';
  callee: string;
  args: ASTNode[];
}

export interface MethodCall {
  type: 'MethodCall';
  object: ASTNode;
  method: string;
  args: ASTNode[];
}

export interface NewExpression {
  type: 'NewExpression';
  className: string;
  args: ASTNode[];
}

export interface Identifier {
  type: 'Identifier';
  name: string;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export interface BooleanLiteral {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral {
  type: 'NullLiteral';
  value: null;
}

export interface BinaryExpression {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpression {
  type: 'UnaryExpression';
  operator: string;
  operand: ASTNode;
}

export interface Assignment {
  type: 'Assignment';
  target: ASTNode;
  value: ASTNode;
}

export interface CompoundAssignment {
  type: 'CompoundAssignment';
  operator: string; // '+=' | '-=' | '*=' | '/='
  target: ASTNode;
  value: ASTNode;
}

export interface IfStatement {
  type: 'IfStatement';
  condition: ASTNode;
  thenBranch: ASTNode[];
  elseBranch?: ASTNode[];
}

export interface MatchCase {
  pattern: string | number | boolean | 'default';
  body: ASTNode[];
}

export interface MatchStatement {
  type: 'MatchStatement';
  expression: ASTNode;
  cases: MatchCase[];
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  value?: ASTNode;
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: ASTNode;
}

export interface ImportDeclaration {
  type: 'ImportDeclaration';
  defaultImport?: string;
  namedImports: string[];
  path: string;
}

export interface PropertyAccess {
  type: 'PropertyAccess';
  object: ASTNode;
  property: string;
}

export interface IndexAccess {
  type: 'IndexAccess';
  object: ASTNode;
  index: ASTNode;
}

export interface ArrayExpression {
  type: 'ArrayExpression';
  elements: ASTNode[];
}

export interface ObjectExpression {
  type: 'ObjectExpression';
  properties: { key: string; value: ASTNode }[];
}

export interface ThrowStatement {
  type: 'ThrowStatement';
  expression: ASTNode;
}

export interface WhileStatement {
  type: 'WhileStatement';
  condition: ASTNode;
  body: ASTNode[];
}

export interface ForStatement {
  type: 'ForStatement';
  variable: string;
  iterable: ASTNode;
  body: ASTNode[];
}

export interface TryCatchStatement {
  type: 'TryCatchStatement';
  tryBody: ASTNode[];
  catchVar: string;
  catchBody: ASTNode[];
}