// Token types for Prism language
export enum TokenType {
  // Keywords
  FUNCTION = 'FUNCTION',
  NEW = 'NEW',
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  CLASS = 'CLASS',
  IF = 'IF',
  ELSE = 'ELSE',
  MATCH = 'MATCH',
  RETURN = 'RETURN',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  MUT = 'MUT',
  LET = 'LET',
  USE = 'USE',
  THROW = 'THROW',
  FROM = 'FROM',
  WHILE = 'WHILE',
  FOR = 'FOR',
  IN = 'IN',

  // Types
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  VOID = 'VOID',
  INT = 'INT',
  BOOL = 'BOOL',
  ANY = 'ANY',

  // Identifiers & literals
  IDENTIFIER = 'IDENTIFIER',
  STRING_LITERAL = 'STRING_LITERAL',
  NUMBER_LITERAL = 'NUMBER_LITERAL',

  // Operators
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
  ARROW = 'ARROW',
  FAT_ARROW = 'FAT_ARROW',
  QUESTION = 'QUESTION',
  NULLISH = 'NULLISH',

  // Punctuators
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

  // Special
  EOF = 'EOF',
  COMMENT = 'COMMENT',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// AST Node types
export type ASTNode =
  | Program
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration
  | MethodDeclaration
  | CallExpression
  | Identifier
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | NullLiteral
  | BinaryExpression
  | UnaryExpression
  | IfStatement
  | MatchStatement
  | ReturnStatement
  | ExpressionStatement
  | ImportDeclaration
  | PropertyAccess
  | ArrayExpression
  | ObjectExpression
  | ThrowStatement
  | WhileStatement
  | ForStatement;

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
  properties: { name: string; typeAnnotation?: string; visibility: 'public' | 'private' }[];
}

export interface MethodDeclaration {
  type: 'MethodDeclaration';
  name: string;
  params: { name: string; typeAnnotation?: string }[];
  returnType?: string;
  visibility: 'public' | 'private';
  body: ASTNode[];
}

export interface CallExpression {
  type: 'CallExpression';
  callee: string;
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

export interface IfStatement {
  type: 'IfStatement';
  condition: ASTNode;
  thenBranch: ASTNode[];
  elseBranch?: ASTNode[];
}

export interface MatchCase {
  pattern: string | number | 'default';
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