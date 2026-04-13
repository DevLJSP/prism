import {
  ASTNode,
  Program,
  VariableDeclaration,
  FunctionDeclaration,
  IfStatement,
  ExpressionStatement,
  TryCatchStatement,
} from "./tokens";

export class Formatter {
  private indentLevel = 0;
  private lines: string[] = [];

  format(program: Program): string {
    this.lines = [];
    this.indentLevel = 0;
    for (let i = 0; i < program.body.length; i++) {
      this.fmtNode(program.body[i]);
    }
    return this.lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }

  private ind(): string {
    return "  ".repeat(this.indentLevel);
  }

  private emit(s: string): void {
    this.lines.push(this.ind() + s);
  }

  private blank(): void {
    const last = this.lines[this.lines.length - 1];
    if (last !== undefined && last !== "") {
      this.lines.push("");
    }
  }

  private fmtBlock(stmts: ASTNode[]): void {
    this.indentLevel++;
    for (const s of stmts) {
      this.fmtNode(s);
    }
    this.indentLevel--;
  }

  private fmtNode(node: ASTNode): void {
    switch (node.type) {
      case "ImportDeclaration": {
        const parts: string[] = [];
        if (node.defaultImport) {
          const alias = node.defaultAlias ? ` as ${node.defaultAlias}` : "";
          parts.push(node.defaultImport + alias);
        }
        if (node.namedImports.length > 0) {
          const named = node.namedImports
            .map((n) => (n.alias ? `${n.name} as ${n.alias}` : n.name))
            .join(", ");
          parts.push(`{ ${named} }`);
        }
        this.emit(`use ${parts.join(", ")} from "${node.path}"`);
        break;
      }

      case "ExportDeclaration": {
        const prefix = node.isDefault ? "export default " : "export ";
        const savedLines = this.lines;
        const savedIndent = this.indentLevel;
        this.lines = [];
        this.indentLevel = 0;
        this.fmtNode(node.declaration);
        const inner = this.lines;
        this.lines = savedLines;
        this.indentLevel = savedIndent;
        if (inner.length > 0) {
          this.lines.push(this.ind() + prefix + inner[0].trimStart());
          for (let i = 1; i < inner.length; i++) {
            this.lines.push(inner[i]);
          }
        }
        break;
      }

      case "VariableDeclaration": {
        const kw = node.isMutable ? "mut" : "final";
        const type = node.typeAnnotation ? `${node.typeAnnotation} ` : "";
        const init = node.initializer ? ` = ${this.fmtExpr(node.initializer)}` : "";
        this.emit(`${kw} ${type}${node.name}${init}`);
        break;
      }

      case "FunctionDeclaration": {
        this.blank();
        const asyncPrefix = node.isAsync ? "async " : "";
        const tParams =
          node.typeParams && node.typeParams.length > 0
            ? `<${node.typeParams.join(", ")}>`
            : "";
        const params = node.params
          .map((p) => (p.typeAnnotation ? `${p.typeAnnotation} ${p.name}` : p.name))
          .join(", ");
        const ret = node.returnType ? ` -> ${node.returnType}` : "";
        this.emit(`${asyncPrefix}fn ${node.name}${tParams}(${params})${ret} {`);
        this.fmtBlock(node.body);
        this.emit("}");
        this.blank();
        break;
      }

      case "ClassDeclaration": {
        this.blank();
        const tParams =
          node.typeParams && node.typeParams.length > 0
            ? `<${node.typeParams.join(", ")}>`
            : "";
        const ext = node.extendsClass ? ` extends ${node.extendsClass}` : "";
        const impl =
          node.implementsInterfaces && node.implementsInterfaces.length > 0
            ? ` implements ${node.implementsInterfaces.join(", ")}`
            : "";
        this.emit(`class ${node.name}${tParams}${ext}${impl} {`);
        this.indentLevel++;

        for (const prop of node.properties) {
          const vis = prop.visibility === "priv" ? "priv " : "pub ";
          const mut = prop.isMutable ? "mut " : "final ";
          const type = prop.typeAnnotation ? `${prop.typeAnnotation} ` : "";
          const init = prop.initializer ? ` = ${this.fmtExpr(prop.initializer)}` : "";
          this.emit(`${vis}${mut}${type}${prop.name}${init}`);
        }

        if (node.constructor) {
          this.blank();
          const params = node.constructor.params
            .map((p) => (p.typeAnnotation ? `${p.typeAnnotation} ${p.name}` : p.name))
            .join(", ");
          this.emit(`constructor(${params}) {`);
          this.fmtBlock(node.constructor.body);
          this.emit("}");
        }

        for (const method of node.methods) {
          this.blank();
          const vis = method.visibility === "priv" ? "priv " : "pub ";
          const stat = method.isStatic ? "static " : "";
          const asyncPrefix = method.isAsync ? "async " : "";
          const tP =
            method.typeParams && method.typeParams.length > 0
              ? `<${method.typeParams.join(", ")}>`
              : "";
          const params = method.params
            .map((p) => (p.typeAnnotation ? `${p.typeAnnotation} ${p.name}` : p.name))
            .join(", ");
          const ret = method.returnType ? ` -> ${method.returnType}` : "";
          this.emit(`${vis}${stat}${asyncPrefix}fn ${method.name}${tP}(${params})${ret} {`);
          this.fmtBlock(method.body);
          this.emit("}");
        }

        this.indentLevel--;
        this.emit("}");
        this.blank();
        break;
      }

      case "InterfaceDeclaration": {
        this.blank();
        const tParams =
          node.typeParams && node.typeParams.length > 0
            ? `<${node.typeParams.join(", ")}>`
            : "";
        const ext =
          node.extendsInterfaces && node.extendsInterfaces.length > 0
            ? ` extends ${node.extendsInterfaces.join(", ")}`
            : "";
        this.emit(`interface ${node.name}${tParams}${ext} {`);
        this.indentLevel++;

        for (const prop of node.properties) {
          const opt = prop.optional ? "?" : "";
          const ro = prop.readonly ? "readonly " : "";
          const type = prop.typeAnnotation ? ` ${prop.typeAnnotation}` : "";
          this.emit(`${ro}${prop.name}${opt}${type}`);
        }

        for (const method of node.methods) {
          const tP =
            method.typeParams && method.typeParams.length > 0
              ? `<${method.typeParams.join(", ")}>`
              : "";
          const opt = method.optional ? "?" : "";
          const params = method.params
            .map((p) => (p.typeAnnotation ? `${p.typeAnnotation} ${p.name}` : p.name))
            .join(", ");
          const ret = method.returnType ? ` -> ${method.returnType}` : "";
          this.emit(`fn ${method.name}${opt}${tP}(${params})${ret}`);
        }

        this.indentLevel--;
        this.emit("}");
        this.blank();
        break;
      }

      case "EnumDeclaration": {
        this.blank();
        this.emit(`enum ${node.name} {`);
        this.indentLevel++;
        node.members.forEach((m, i) => {
          const init = m.initializer ? ` = ${this.fmtExpr(m.initializer)}` : "";
          const comma = i < node.members.length - 1 ? "," : "";
          this.emit(`${m.name}${init}${comma}`);
        });
        this.indentLevel--;
        this.emit("}");
        this.blank();
        break;
      }

      case "IfStatement": {
        this.fmtIf(node);
        break;
      }

      case "MatchStatement": {
        this.emit(`match ${this.fmtExpr(node.expression)} {`);
        this.indentLevel++;
        node.cases.forEach((c, i) => {
          const pattern =
            c.pattern === "default"
              ? "_"
              : typeof c.pattern === "string"
              ? `"${c.pattern}"`
              : String(c.pattern);
          const comma = i < node.cases.length - 1 ? "," : "";
          this.emit(`${pattern} => {`);
          this.fmtBlock(c.body);
          this.emit(`}${comma}`);
        });
        this.indentLevel--;
        this.emit("}");
        break;
      }

      case "ForStatement": {
        this.emit(`for ${node.variable} in ${this.fmtExpr(node.iterable)} {`);
        this.fmtBlock(node.body);
        this.emit("}");
        break;
      }

      case "WhileStatement": {
        this.emit(`while ${this.fmtExpr(node.condition)} {`);
        this.fmtBlock(node.body);
        this.emit("}");
        break;
      }

      case "DoWhileStatement": {
        this.emit("do {");
        this.fmtBlock(node.body);
        this.emit(`} while (${this.fmtExpr(node.condition)})`);
        break;
      }

      case "CForStatement": {
        const init = node.init
          ? node.init.type === "VariableDeclaration"
            ? (() => {
                const v = node.init as VariableDeclaration;
                const kw = v.isMutable ? "mut" : "final";
                const type = v.typeAnnotation ? `${v.typeAnnotation} ` : "";
                const initPart = v.initializer ? ` = ${this.fmtExpr(v.initializer)}` : "";
                return `${kw} ${type}${v.name}${initPart}`;
              })()
            : this.fmtExpr(node.init)
          : "";
        const cond = node.condition ? this.fmtExpr(node.condition) : "";
        const inc = node.increment ? this.fmtExpr(node.increment) : "";
        this.emit(`for (${init}; ${cond}; ${inc}) {`);
        this.fmtBlock(node.body);
        this.emit("}");
        break;
      }

      case "TryCatchStatement": {
        this.emit("try {");
        this.fmtBlock(node.tryBody);
        this.emit(`} catch (${node.catchVar}) {`);
        this.fmtBlock(node.catchBody);
        this.emit("}");
        break;
      }

      case "ReturnStatement": {
        const val = node.value ? ` ${this.fmtExpr(node.value)}` : "";
        this.emit(`shine${val}`);
        break;
      }

      case "ThrowStatement": {
        this.emit(`shatter ${this.fmtExpr(node.expression)}`);
        break;
      }

      case "BreakStatement":
        this.emit("break");
        break;

      case "ContinueStatement":
        this.emit("continue");
        break;

      case "ExpressionStatement": {
        this.emit(this.fmtExpr(node.expression));
        break;
      }

      default:
        this.emit(`/* unhandled: ${(node as ASTNode).type} */`);
    }
  }

  private fmtIf(node: IfStatement, isElseIf = false): void {
    const prefix = isElseIf ? "} else " : "";
    this.emit(`${prefix}if ${this.fmtExpr(node.condition)} {`);
    this.fmtBlock(node.thenBranch);

    if (node.elseBranch) {
      if (node.elseBranch.length === 1 && node.elseBranch[0].type === "IfStatement") {
        const lastLine = this.lines[this.lines.length - 1];
        this.lines[this.lines.length - 1] = lastLine;
        this.fmtIfElse(node.elseBranch[0] as IfStatement);
      } else {
        this.emit("} else {");
        this.fmtBlock(node.elseBranch);
        this.emit("}");
      }
    } else {
      this.emit("}");
    }
  }

  private fmtIfElse(node: IfStatement): void {
    const lastLine = this.lines[this.lines.length - 1];
    this.lines[this.lines.length - 1] =
      lastLine + ` else if ${this.fmtExpr(node.condition)} {`;
    this.fmtBlock(node.thenBranch);

    if (node.elseBranch) {
      if (node.elseBranch.length === 1 && node.elseBranch[0].type === "IfStatement") {
        this.fmtIfElse(node.elseBranch[0] as IfStatement);
      } else {
        this.emit("} else {");
        this.fmtBlock(node.elseBranch);
        this.emit("}");
      }
    } else {
      this.emit("}");
    }
  }

  fmtExpr(node: ASTNode): string {
    switch (node.type) {
      case "Identifier":
        return node.name;
      case "StringLiteral":
        return `"${node.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      case "NumberLiteral":
        return String(node.value);
      case "BooleanLiteral":
        return String(node.value);
      case "NullLiteral":
        return "null";
      case "AwaitExpression":
        return `await ${this.fmtExpr(node.expression)}`;
      case "BinaryExpression":
        return `${this.fmtExpr(node.left)} ${node.operator} ${this.fmtExpr(node.right)}`;
      case "UnaryExpression":
        return `${node.operator}${this.fmtExpr(node.operand)}`;
      case "Assignment":
        return `${this.fmtExpr(node.target)} = ${this.fmtExpr(node.value)}`;
      case "CompoundAssignment":
        return `${this.fmtExpr(node.target)} ${node.operator} ${this.fmtExpr(node.value)}`;
      case "PropertyAccess":
        return `${this.fmtExpr(node.object)}.${node.property}`;
      case "IndexAccess":
        return `${this.fmtExpr(node.object)}[${this.fmtExpr(node.index)}]`;
      case "ArrayExpression":
        return `[${node.elements.map((e) => this.fmtExpr(e)).join(", ")}]`;
      case "ObjectExpression":
        return `{ ${node.properties.map((p) => `${p.key}: ${this.fmtExpr(p.value)}`).join(", ")} }`;
      case "NewExpression":
        return `new ${node.className}(${node.args.map((a) => this.fmtExpr(a)).join(", ")})`;
      case "MethodCall":
        return `${this.fmtExpr(node.object)}.${node.method}(${node.args.map((a) => this.fmtExpr(a)).join(", ")})`;
      case "CallExpression":
        return `${node.callee}(${node.args.map((a) => this.fmtExpr(a)).join(", ")})`;
      case "FunctionDeclaration": {
        const asyncPrefix = node.isAsync ? "async " : "";
        const params = node.params
          .map((p) => (p.typeAnnotation ? `${p.typeAnnotation} ${p.name}` : p.name))
          .join(", ");
        const ret = node.returnType ? ` -> ${node.returnType}` : "";
        const bodyParts = node.body.map((s) => {
          const savedLines = this.lines;
          const savedIndent = this.indentLevel;
          this.lines = [];
          this.indentLevel = 0;
          this.fmtNode(s);
          const result = this.lines.join(" ").trim();
          this.lines = savedLines;
          this.indentLevel = savedIndent;
          return result;
        });
        return `${asyncPrefix}fn(${params})${ret} { ${bodyParts.join(" ")} }`;
      }
      default:
        return `/* expr:${(node as ASTNode).type} */`;
    }
  }
}