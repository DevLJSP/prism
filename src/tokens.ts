export enum TokenType {
  FN = 'FN',
  FINAL = 'FINAL',
  MUT = 'MUT',
  CLASS = 'CLASS',
  PUB = 'PUB',
  PRIV = 'PRIV',
  STATIC = 'STATIC',
  IF = 'IF',
  ELSE = 'ELSE',
  MATCH = 'MATCH',
  SHINE = 'SHINE',
  SHATTER = 'SHATTER',
  FOR = 'FOR',
  C_FOR = 'C_FOR',
  IN = 'IN',
  WHILE = 'WHILE',
  DO = 'DO',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  USE = 'USE',
  FROM = 'FROM',
  NEW = 'NEW',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  TRY = 'TRY',
  CATCH = 'CATCH',
  CONSTRUCTOR = 'CONSTRUCTOR',
  ENUM = 'ENUM',
  EXPORT = 'EXPORT',
  INTERFACE = 'INTERFACE',
  IMPLEMENTS = 'IMPLEMENTS',
  EXTENDS = 'EXTENDS',
  AS = 'AS',

  STRING = 'STRING',
  INT = 'INT',
  FLOAT = 'FLOAT',
  BOOL = 'BOOL',
  VOID = 'VOID',
  ANY = 'ANY',

  IDENTIFIER = 'IDENTIFIER',
  STRING_LITERAL = 'STRING_LITERAL',
  NUMBER_LITERAL = 'NUMBER_LITERAL',

  EQUALS = 'EQUALS',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  POW = 'POW',
  MOD = 'MOD',
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

  PLUS_EQ = 'PLUS_EQ',
  MINUS_EQ = 'MINUS_EQ',
  STAR_EQ = 'STAR_EQ',
  SLASH_EQ = 'SLASH_EQ',

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

  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export type ASTNode =
  | Program
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration
  | MethodDeclaration
  | ConstructorDeclaration
  | EnumDeclaration
  | ExportDeclaration
  | InterfaceDeclaration
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
  | TryCatchStatement
  | DoWhileStatement
  | CForStatement
  | BreakStatement
  | ContinueStatement;

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
  line?: number;
  col?: number;
}

export interface FunctionDeclaration {
  type: 'FunctionDeclaration';
  name: string;
  typeParams?: string[];
  params: { name: string; typeAnnotation?: string }[];
  returnType?: string;
  body: ASTNode[];
  line?: number;
  col?: number;
}

export interface ClassDeclaration {
  type: 'ClassDeclaration';
  name: string;
  typeParams?: string[];
  extendsClass?: string;
  implementsInterfaces?: string[];
  methods: MethodDeclaration[];
  properties: ClassProperty[];
  constructor?: ConstructorDeclaration;
  line?: number;
  col?: number;
}

export interface ClassProperty {
  name: string;
  typeAnnotation?: string;
  visibility: 'pub' | 'priv';
  initializer?: ASTNode;
  isMutable?: boolean;
}

export interface MethodDeclaration {
  type: 'MethodDeclaration';
  name: string;
  typeParams?: string[];
  params: { name: string; typeAnnotation?: string }[];
  returnType?: string;
  visibility: 'pub' | 'priv';
  isStatic: boolean;
  body: ASTNode[];
}

export interface ConstructorDeclaration {
  type: 'ConstructorDeclaration';
  params: { name: string; typeAnnotation?: string }[];
  body: ASTNode[];
}

export interface EnumMember {
  name: string;
  initializer?: ASTNode;
}

export interface EnumDeclaration {
  type: 'EnumDeclaration';
  name: string;
  members: EnumMember[];
  line?: number;
  col?: number;
}

export interface ExportDeclaration {
  type: 'ExportDeclaration';
  declaration: ASTNode;
  isDefault: boolean;
  line?: number;
  col?: number;
}

export interface InterfaceProperty {
  name: string;
  typeAnnotation?: string;
  optional?: boolean;
  readonly?: boolean;
}

export interface InterfaceMethod {
  name: string;
  typeParams?: string[];
  params: { name: string; typeAnnotation?: string }[];
  returnType?: string;
  optional?: boolean;
}

export interface InterfaceDeclaration {
  type: 'InterfaceDeclaration';
  name: string;
  typeParams?: string[];
  extendsInterfaces?: string[];
  methods: InterfaceMethod[];
  properties: InterfaceProperty[];
  line?: number;
  col?: number;
}

export interface NamedImport {
  name: string;
  alias?: string;
}

export interface ImportDeclaration {
  type: 'ImportDeclaration';
  defaultImport?: string;
  defaultAlias?: string;
  namedImports: NamedImport[];
  path: string;
  line?: number;
  col?: number;
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
  operator: string;
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
  line?: number;
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: ASTNode;
  line?: number;
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

export interface DoWhileStatement {
  type: 'DoWhileStatement';
  condition: ASTNode;
  body: ASTNode[];
}

export interface CForStatement {
  type: 'CForStatement';
  init: ASTNode | null;
  condition: ASTNode | null;
  increment: ASTNode | null;
  body: ASTNode[];
}

export interface TryCatchStatement {
  type: 'TryCatchStatement';
  tryBody: ASTNode[];
  catchVar: string;
  catchBody: ASTNode[];
}

export interface BreakStatement {
  type: 'BreakStatement';
}

export interface ContinueStatement {
  type: 'ContinueStatement';
}