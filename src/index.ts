import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { CodeGenerator } from "./codegen";

export interface TranspileOptions {
  emitTypes?: boolean;
  filename?: string;
}

export interface TranspileResult {
  code: string;
  ast?: object;
}

export function transpile(source: string, options: TranspileOptions = {}): TranspileResult {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const gen = new CodeGenerator({ emitTypes: options.emitTypes ?? true });
  const code = gen.generate(ast);

  return { code, ast };
}

export { Lexer } from "./lexer";
export { Parser } from "./parser";
export { CodeGenerator } from "./codegen";
export { Formatter } from "./formatter";
export { Linter, formatDiagnostics } from "./linter";
export type { LintDiagnostic, DiagnosticSeverity } from "./linter";
export { startRepl } from "./repl";