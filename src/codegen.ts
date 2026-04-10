import { ASTNode, FunctionDeclaration, MatchCase } from "./tokens";

const TYPE_MAP: Record<string, string> = {
  int: "number",
  float: "number",
  bool: "boolean",
  string: "string",
  void: "void",
  any: "any",
};

const JS_RESERVED = new Set([
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

function mapType(t: string | undefined): string {
  if (!t) return "";
  if (t.endsWith("[]"))
    return (TYPE_MAP[t.slice(0, -2)] ?? t.slice(0, -2)) + "[]";
  return TYPE_MAP[t] ?? t;
}

export class CodeGenerator {
  private indentLevel = 0;
  private emitTypes: boolean;
  private identMap = new Map<string, string>();
  private identSeq = 0;

  constructor(options: { emitTypes?: boolean } = {}) {
    this.emitTypes = options.emitTypes ?? true;
  }

  private ind(): string {
    return "  ".repeat(this.indentLevel);
  }

  private block(fn: () => string[]): string[] {
    this.indentLevel++;
    const lines = fn();
    this.indentLevel--;
    return lines;
  }

  private safeIdent(name: string | undefined): string {
    const raw = (name ?? "").trim();

    if (raw === "this" || raw === "super") return raw;

    const cached = this.identMap.get(raw);
    if (cached) return cached;

    let out = raw;

    if (!out) {
      out = `_unnamed${++this.identSeq}`;
    } else {
      out = out.replace(/[^A-Za-z0-9_$]/g, "_");
      if (!/^[A-Za-z_$]/.test(out)) {
        out = `_${out}`;
      }
      if (JS_RESERVED.has(out)) {
        out = `_${out}`;
      }
    }

    this.identMap.set(raw, out);
    return out;
  }

  generate(node: ASTNode): string {
    return this.genNode(node).join("\n");
  }

  private genNode(node: ASTNode): string[] {
    switch (node.type) {
      case "Program":
        return node.body.flatMap((n) => this.genNode(n));

      case "ImportDeclaration": {
        const { defaultImport, namedImports, path } = node;
        const parts: string[] = [];
        if (defaultImport) parts.push(this.safeIdent(defaultImport));
        if (namedImports.length > 0)
          parts.push(`{ ${namedImports.map((n) => this.safeIdent(n)).join(", ")} }`);
        return [`import ${parts.join(", ")} from "${path}";`];
      }

      case "DoWhileStatement": {
        const body = this.block(() =>
          node.body.flatMap((s) => this.genNode(s)),
        );
        return [
          `${this.ind()}do {`,
          ...body,
          `${this.ind()}} while (${this.genExpr(node.condition)});`,
        ];
      }

      case "CForStatement": {
        let initPart = "";
        if (node.init) {
          if (node.init.type === "VariableDeclaration") {
            const varLines = this.genNode(node.init);
            let varLine = varLines[0].trim();
            if (varLine.endsWith(";")) varLine = varLine.slice(0, -1);
            initPart = varLine;
          } else {
            initPart = this.genExpr(node.init);
          }
        }
        const condPart = node.condition ? this.genExpr(node.condition) : "";
        const incPart = node.increment ? this.genExpr(node.increment) : "";
        const body = this.block(() =>
          node.body.flatMap((s) => this.genNode(s)),
        );
        return [
          `${this.ind()}for (${initPart}; ${condPart}; ${incPart}) {`,
          ...body,
          `${this.ind()}}`,
        ];
      }

      case "VariableDeclaration": {
        const kw = node.isMutable ? "let" : "const";
        const name = this.safeIdent(node.name);
        const typePart =
          this.emitTypes && node.typeAnnotation
            ? `: ${mapType(node.typeAnnotation)}`
            : "";
        const initPart = node.initializer
          ? ` = ${this.genExpr(node.initializer)}`
          : "";
        return [`${this.ind()}${kw} ${name}${typePart}${initPart};`];
      }

      case "FunctionDeclaration": {
        if (!node.name) {
          return this.genAnonFnLines(node);
        }
        const sig = this.buildFnSignature(
          node.name,
          node.params,
          node.returnType,
        );
        const body = this.block(() =>
          node.body.flatMap((s) => this.genNode(s)),
        );
        return [`${this.ind()}function ${sig} {`, ...body, `${this.ind()}}`];
      }

      case "EnumDeclaration": {
        const lines: string[] = [];
        const members = node.members;
        const pairs: string[] = [];
        let autoValue = 0;

        for (const member of members) {
          if (member.initializer) {
            const val = this.genExpr(member.initializer);
            pairs.push(`"${member.name}": ${val}`);
            if (
              member.initializer.type === "NumberLiteral" &&
              typeof member.initializer.value === "number"
            ) {
              autoValue = member.initializer.value + 1;
            } else {
              autoValue++;
            }
          } else {
            pairs.push(`"${member.name}": ${autoValue}`);
            autoValue++;
          }
        }

        if (this.emitTypes) {
          lines.push(`${this.ind()}const ${this.safeIdent(node.name)} = Object.freeze({`);
          for (const pair of pairs) {
            lines.push(`${this.ind()}  ${pair},`);
          }
          lines.push(`${this.ind()}}) as const;`);
        } else {
          lines.push(`${this.ind()}const ${this.safeIdent(node.name)} = Object.freeze({`);
          for (const pair of pairs) {
            lines.push(`${this.ind()}  ${pair},`);
          }
          lines.push(`${this.ind()}});`);
        }

        return lines;
      }

      case "ClassDeclaration": {
        const lines: string[] = [`${this.ind()}class ${this.safeIdent(node.name)} {`];
        this.indentLevel++;

        for (const prop of node.properties) {
          const visPart = this.emitTypes
            ? prop.visibility === "priv"
              ? "private "
              : "public "
            : "";
          const typePart =
            this.emitTypes && prop.typeAnnotation
              ? `: ${mapType(prop.typeAnnotation)}`
              : "";
          const initPart = prop.initializer
            ? ` = ${this.genExpr(prop.initializer)}`
            : "";
          lines.push(
            `${this.ind()}${visPart}${this.safeIdent(prop.name)}${typePart}${initPart};`,
          );
        }

        if (node.properties.length > 0 && (node.constructor || node.methods.length > 0)) {
          lines.push("");
        }

        if (node.constructor) {
          const ctor = node.constructor;
          const paramStr = ctor.params
            .map((p) => {
              const t =
                this.emitTypes && p.typeAnnotation
                  ? `: ${mapType(p.typeAnnotation)}`
                  : "";
              return `${this.safeIdent(p.name)}${t}`;
            })
            .join(", ");
          lines.push(`${this.ind()}constructor(${paramStr}) {`);
          const ctorBody = this.block(() =>
            ctor.body.flatMap((s) => this.genNode(s)),
          );
          lines.push(...ctorBody);
          lines.push(`${this.ind()}}`);
          if (node.methods.length > 0) lines.push("");
        }

        for (const method of node.methods) {
          const visPart = this.emitTypes
            ? method.visibility === "priv"
              ? "private "
              : "public "
            : "";
          const staticPart = method.isStatic ? "static " : "";
          const sig = this.buildFnSignature(
            method.name,
            method.params,
            method.returnType,
          );
          const body = this.block(() =>
            method.body.flatMap((s) => this.genNode(s)),
          );
          lines.push(`${this.ind()}${visPart}${staticPart}${sig} {`);
          lines.push(...body);
          lines.push(`${this.ind()}}`);
          lines.push("");
        }

        this.indentLevel--;
        lines.push(`${this.ind()}}`);
        return lines;
      }

      case "IfStatement": {
        const cond = this.genExpr(node.condition);
        const thenLines = this.block(() =>
          node.thenBranch.flatMap((s) => this.genNode(s)),
        );
        const result = [
          `${this.ind()}if (${cond}) {`,
          ...thenLines,
          `${this.ind()}}`,
        ];

        if (node.elseBranch) {
          if (
            node.elseBranch.length === 1 &&
            node.elseBranch[0].type === "IfStatement"
          ) {
            const inner = this.genNode(node.elseBranch[0]);
            result[result.length - 1] =
              result[result.length - 1] + " else " + inner[0].trimStart();
            result.push(...inner.slice(1));
          } else {
            const elseLines = this.block(() =>
              node.elseBranch!.flatMap((s) => this.genNode(s)),
            );
            result[result.length - 1] += " else {";
            result.push(...elseLines, `${this.ind()}}`);
          }
        }

        return result;
      }

      case "MatchStatement": {
        const lines: string[] = [
          `${this.ind()}switch (${this.genExpr(node.expression)}) {`,
        ];
        this.indentLevel++;

        for (const c of node.cases) {
          const label =
            c.pattern === "default"
              ? "default:"
              : `case ${this.genPattern(c.pattern)}:`;
          lines.push(`${this.ind()}${label} {`);
          const body = this.block(() => c.body.flatMap((s) => this.genNode(s)));
          lines.push(...body);
          lines.push(`${this.ind()}  break;`);
          lines.push(`${this.ind()}}`);
        }

        this.indentLevel--;
        lines.push(`${this.ind()}}`);
        return lines;
      }

      case "ForStatement": {
        const iter = this.genExpr(node.iterable);
        const body = this.block(() =>
          node.body.flatMap((s) => this.genNode(s)),
        );
        return [
          `${this.ind()}for (const ${this.safeIdent(node.variable)} of ${iter}) {`,
          ...body,
          `${this.ind()}}`,
        ];
      }

      case "WhileStatement": {
        const cond = this.genExpr(node.condition);
        const body = this.block(() =>
          node.body.flatMap((s) => this.genNode(s)),
        );
        return [`${this.ind()}while (${cond}) {`, ...body, `${this.ind()}}`];
      }

      case "ReturnStatement":
        return [
          `${this.ind()}return${node.value ? " " + this.genExpr(node.value) : ""};`,
        ];

      case "ThrowStatement":
        return [
          `${this.ind()}throw new Error(${this.genExpr(node.expression)});`,
        ];

      case "TryCatchStatement": {
        const tryLines = this.block(() =>
          node.tryBody.flatMap((s) => this.genNode(s)),
        );
        const catchLines = this.block(() =>
          node.catchBody.flatMap((s) => this.genNode(s)),
        );
        return [
          `${this.ind()}try {`,
          ...tryLines,
          `${this.ind()}} catch (${this.safeIdent(node.catchVar)}) {`,
          ...catchLines,
          `${this.ind()}}`,
        ];
      }

      case "BreakStatement":
        return [`${this.ind()}break;`];

      case "ContinueStatement":
        return [`${this.ind()}continue;`];

      case "ExpressionStatement":
        return [`${this.ind()}${this.genExpr(node.expression)};`];

      default:
        return [`/* unhandled node: ${(node as ASTNode).type} */`];
    }
  }

  private genAnonFnLines(node: FunctionDeclaration): string[] {
    const paramStr = node.params
      .map((p) => {
        const t =
          this.emitTypes && p.typeAnnotation
            ? `: ${mapType(p.typeAnnotation)}`
            : "";
        return `${this.safeIdent(p.name)}${t}`;
      })
      .join(", ");
    const retStr =
      this.emitTypes && node.returnType ? `: ${mapType(node.returnType)}` : "";
    const header = `${this.ind()}(${paramStr})${retStr} => {`;
    const body = this.block(() => node.body.flatMap((s) => this.genNode(s)));
    return [header, ...body, `${this.ind()}}`];
  }

  private buildFnSignature(
    name: string,
    params: { name: string; typeAnnotation?: string }[],
    returnType?: string,
  ): string {
    const paramStr = params
      .map((p) => {
        const t =
          this.emitTypes && p.typeAnnotation
            ? `: ${mapType(p.typeAnnotation)}`
            : "";
        return `${this.safeIdent(p.name)}${t}`;
      })
      .join(", ");
    const retStr =
      this.emitTypes && returnType ? `: ${mapType(returnType)}` : "";
    return `${this.safeIdent(name)}(${paramStr})${retStr}`;
  }

  private genPattern(pattern: MatchCase["pattern"]): string {
    if (typeof pattern === "string") return JSON.stringify(pattern);
    if (typeof pattern === "boolean") return String(pattern);
    return String(pattern);
  }

  genExpr(node: ASTNode): string {
    switch (node.type) {
      case "Identifier":
        return this.safeIdent(node.name);

      case "StringLiteral":
        return JSON.stringify(node.value);

      case "NumberLiteral":
        return String(node.value);

      case "BooleanLiteral":
        return String(node.value);

      case "NullLiteral":
        return "null";

      case "BinaryExpression":
        if (node.operator === "**")
          return `Math.pow(${this.genExpr(node.left)}, ${this.genExpr(node.right)})`;
        if (node.operator === "%")
          return `${this.genExpr(node.left)} % ${this.genExpr(node.right)}`;
        return `${this.genExpr(node.left)} ${node.operator} ${this.genExpr(node.right)}`;

      case "UnaryExpression":
        return `${node.operator}${this.genExpr(node.operand)}`;

      case "Assignment":
        return `${this.genExpr(node.target)} = ${this.genExpr(node.value)}`;

      case "CompoundAssignment":
        return `${this.genExpr(node.target)} ${node.operator} ${this.genExpr(node.value)}`;

      case "PropertyAccess":
        return `${this.genExpr(node.object)}.${node.property}`;

      case "IndexAccess":
        return `${this.genExpr(node.object)}[${this.genExpr(node.index)}]`;

      case "ArrayExpression":
        return `[${node.elements.map((e) => this.genExpr(e)).join(", ")}]`;

      case "ObjectExpression":
        return `{ ${node.properties
          .map((p) => `${JSON.stringify(p.key)}: ${this.genExpr(p.value)}`)
          .join(", ")} }`;

      case "NewExpression":
        return `new ${this.safeIdent(node.className)}(${node.args
          .map((a) => this.genExpr(a))
          .join(", ")})`;

      case "MethodCall":
        return `${this.genExpr(node.object)}.${node.method}(${this.genArgExprs(node.args)})`;

      case "CallExpression": {
        if (node.callee === "log")
          return `console.log(${this.genArgExprs(node.args)})`;
        if (node.callee === "panic")
          return `(() => { throw new Error(${this.genArgExprs(node.args)}); })()`;
        if (node.callee === "typeOf")
          return `typeof ${this.genExpr(node.args[0])}`;
        return `${this.safeIdent(node.callee)}(${this.genArgExprs(node.args)})`;
      }

      case "FunctionDeclaration": {
        const paramStr = node.params
          .map((p) => {
            const t =
              this.emitTypes && p.typeAnnotation
                ? `: ${mapType(p.typeAnnotation)}`
                : "";
            return `${this.safeIdent(p.name)}${t}`;
          })
          .join(", ");
        const retStr =
          this.emitTypes && node.returnType
            ? `: ${mapType(node.returnType)}`
            : "";
        const bodyStatements = node.body
          .map((s) => this.genNode(s).join(" ").trim())
          .join(" ");
        return `(${paramStr})${retStr} => { ${bodyStatements} }`;
      }

      default:
        return `/* expr: ${(node as ASTNode).type} */`;
    }
  }

  private genArgExprs(args: ASTNode[]): string {
    return args.map((a) => this.genExpr(a)).join(", ");
  }
}