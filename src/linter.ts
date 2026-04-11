import {
  ASTNode,
  Program,
  FunctionDeclaration,
  VariableDeclaration,
  TryCatchStatement,
  BinaryExpression,
  ClassDeclaration,
} from "./tokens";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface LintDiagnostic {
  line: number;
  col: number;
  severity: DiagnosticSeverity;
  code: string;
  message: string;
}

export class Linter {
  private diagnostics: LintDiagnostic[] = [];

  lint(program: Program): LintDiagnostic[] {
    this.diagnostics = [];
    for (const node of program.body) {
      this.walkNode(node, null);
    }
    return this.diagnostics;
  }

  private report(
    severity: DiagnosticSeverity,
    code: string,
    message: string,
    line: number,
    col: number,
  ): void {
    this.diagnostics.push({ severity, code, message, line: line ?? 0, col: col ?? 0 });
  }

  private walkNode(node: ASTNode, parentFn: FunctionDeclaration | null): void {
    switch (node.type) {
      case "FunctionDeclaration":
        this.checkFunction(node);
        break;

      case "VariableDeclaration":
        this.checkVariable(node);
        break;

      case "ClassDeclaration":
        this.checkClass(node);
        break;

      case "TryCatchStatement":
        this.checkTryCatch(node);
        for (const s of node.tryBody) this.walkNode(s, parentFn);
        for (const s of node.catchBody) this.walkNode(s, parentFn);
        break;

      case "IfStatement":
        this.checkBooleanTrap(node.condition);
        for (const s of node.thenBranch) this.walkNode(s, parentFn);
        if (node.elseBranch) {
          for (const s of node.elseBranch) this.walkNode(s, parentFn);
        }
        break;

      case "WhileStatement":
        this.checkBooleanTrap(node.condition);
        for (const s of node.body) this.walkNode(s, parentFn);
        break;

      case "DoWhileStatement":
        this.checkBooleanTrap(node.condition);
        for (const s of node.body) this.walkNode(s, parentFn);
        break;

      case "ForStatement":
        for (const s of node.body) this.walkNode(s, parentFn);
        break;

      case "CForStatement":
        if (node.init) this.walkNode(node.init, parentFn);
        for (const s of node.body) this.walkNode(s, parentFn);
        break;

      case "MatchStatement":
        for (const c of node.cases) {
          for (const s of c.body) this.walkNode(s, parentFn);
        }
        break;

      case "ExportDeclaration":
        this.walkNode(node.declaration, parentFn);
        break;

      case "ExpressionStatement":
        this.checkExprStatement(node.expression, node.line ?? 0);
        break;

      case "BinaryExpression":
        this.checkBinaryExpression(node);
        break;
    }
  }

  private checkFunction(node: FunctionDeclaration): void {
    if (node.body.length === 0 && node.name) {
      this.report(
        "warning",
        "W001",
        `Function '${node.name}' has an empty body`,
        node.line ?? 0,
        node.col ?? 0,
      );
    }

    const paramNames = new Set<string>();
    for (const p of node.params) {
      if (paramNames.has(p.name)) {
        this.report(
          "error",
          "E001",
          `Duplicate parameter '${p.name}' in function '${node.name || "<anonymous>"}'`,
          node.line ?? 0,
          node.col ?? 0,
        );
      }
      paramNames.add(p.name);
    }

    let seenReturn = false;
    for (let i = 0; i < node.body.length; i++) {
      const stmt = node.body[i];
      if (seenReturn) {
        this.report(
          "warning",
          "W002",
          `Unreachable code after 'shine' in function '${node.name || "<anonymous>"}'`,
          node.line ?? 0,
          node.col ?? 0,
        );
        break;
      }
      if (stmt.type === "ReturnStatement") seenReturn = true;
      this.walkNode(stmt, node);
    }

    if (node.name && /^[a-z]/.test(node.name) === false && /^[A-Z]/.test(node.name)) {
      this.report(
        "info",
        "I001",
        `Function '${node.name}' starts with uppercase — Prism convention is camelCase for functions`,
        node.line ?? 0,
        node.col ?? 0,
      );
    }
  }

  private checkClass(node: ClassDeclaration): void {
    if (!/^[A-Z]/.test(node.name)) {
      this.report(
        "warning",
        "W007",
        `Class '${node.name}' should start with an uppercase letter`,
        node.line ?? 0,
        node.col ?? 0,
      );
    }

    const methodNames = new Set<string>();
    for (const m of node.methods) {
      if (methodNames.has(m.name)) {
        this.report(
          "error",
          "E002",
          `Duplicate method '${m.name}' in class '${node.name}'`,
          node.line ?? 0,
          node.col ?? 0,
        );
      }
      methodNames.add(m.name);
      this.checkFunction({ ...m, type: "FunctionDeclaration" });
    }

    if (node.constructor) {
      for (const s of node.constructor.body) this.walkNode(s, null);
    }
  }

  private checkVariable(node: VariableDeclaration): void {
    if (!node.isMutable && !node.initializer) {
      this.report(
        "warning",
        "W003",
        `'final' variable '${node.name}' declared without an initializer`,
        node.line ?? 0,
        node.col ?? 0,
      );
    }

    if (node.name && /^[A-Z]/.test(node.name) && !node.isMutable) {
      this.report(
        "info",
        "I002",
        `Variable '${node.name}' starts with uppercase — consider lowercase for non-constant variables`,
        node.line ?? 0,
        node.col ?? 0,
      );
    }

    if (node.name && node.name.length === 1 && /^[a-z]$/.test(node.name)) {
      this.report(
        "info",
        "I003",
        `Single-letter variable '${node.name}' — consider a more descriptive name`,
        node.line ?? 0,
        node.col ?? 0,
      );
    }
  }

  private checkTryCatch(node: TryCatchStatement): void {
    if (node.catchBody.length === 0) {
      this.report(
        "warning",
        "W005",
        `Empty catch block — error '${node.catchVar}' is silently swallowed`,
        0,
        0,
      );
    }
  }

  private checkBooleanTrap(condition: ASTNode): void {
    if (condition.type === "BooleanLiteral") {
      this.report(
        "warning",
        "W006",
        `Condition is always ${condition.value} — this branch may never change`,
        0,
        0,
      );
    }
  }

  private checkBinaryExpression(node: BinaryExpression): void {
    if (
      node.left.type === "BooleanLiteral" &&
      node.right.type === "BooleanLiteral" &&
      (node.operator === "==" || node.operator === "!=")
    ) {
      const result =
        node.operator === "==" ? node.left.value === node.right.value : node.left.value !== node.right.value;
      this.report(
        "warning",
        "W008",
        `Comparison between two boolean literals is always ${result}`,
        0,
        0,
      );
    }

    if (node.operator === "==" && node.right.type === "NullLiteral") {
      this.report(
        "info",
        "I004",
        `Use 'null' check carefully — '==' is loose equality`,
        0,
        0,
      );
    }
  }

  private checkExprStatement(expr: ASTNode, line: number): void {
    if (
      expr.type === "BinaryExpression" &&
      (expr.operator === "==" ||
        expr.operator === "!=" ||
        expr.operator === ">" ||
        expr.operator === "<" ||
        expr.operator === ">=" ||
        expr.operator === "<=")
    ) {
      this.report(
        "warning",
        "W009",
        `Comparison result is unused — did you mean to use this in a condition?`,
        line,
        0,
      );
    }

    if (expr.type === "NumberLiteral" || expr.type === "StringLiteral" || expr.type === "BooleanLiteral") {
      this.report(
        "info",
        "I005",
        `Standalone literal value has no effect`,
        line,
        0,
      );
    }
  }
}

export function formatDiagnostics(diagnostics: LintDiagnostic[], filename: string): string {
  if (diagnostics.length === 0) {
    return `✅  ${filename}: no issues found\n`;
  }

  const lines: string[] = [];
  for (const d of diagnostics) {
    const icon = d.severity === "error" ? "✖" : d.severity === "warning" ? "⚠" : "ℹ";
    const loc = d.line > 0 ? `${d.line}:${d.col}` : "?:?";
    lines.push(`  ${icon}  ${filename}:${loc}  [${d.code}]  ${d.message}`);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const infos = diagnostics.filter((d) => d.severity === "info").length;

  lines.push("");
  lines.push(
    `  ${diagnostics.length} issue(s): ${errors} error(s), ${warnings} warning(s), ${infos} info(s)`,
  );

  return lines.join("\n");
}