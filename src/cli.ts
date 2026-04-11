#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { transpile } from "./index";
import { Formatter } from "./formatter";
import { Linter, formatDiagnostics } from "./linter";
import { startRepl } from "./repl";
import { Lexer, PrismError } from "./lexer";
import { Parser } from "./parser";

const BANNER = `
 ██████╗ ██████╗ ██╗███████╗███╗   ███╗
 ██╔══██╗██╔══██╗██║██╔════╝████╗ ████║
 ██████╔╝██████╔╝██║███████╗██╔████╔██║
 ██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║
 ██║     ██║  ██║██║███████║██║ ╚═╝ ██║
 ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝
 v0.1.5 — "Light bends. Your code doesn't have to."
`;

function printHelp(): void {
  console.log(BANNER);
  console.log(`Usage: prism <command> [options] [file]

Commands:
  compile <file.prism>   Transpile to TypeScript/JavaScript
  run     <file.prism>   Transpile and execute with Node
  check   <file.prism>   Parse and report syntax errors only
  fmt     <file.prism>   Format Prism source code in-place
  lint    <file.prism>   Lint Prism source and report issues
  repl                   Start an interactive Prism REPL

Options:
  --js           Emit plain JavaScript (no type annotations)
  --ast          Print the AST as JSON
  --out <file>   Write output to file instead of stdout
  --write        With 'fmt': write formatted output back to the file
  --help         Show this message

Examples:
  prism compile app.prism --out app.ts
  prism run app.prism
  prism check app.prism
  prism fmt app.prism --write
  prism lint app.prism
  prism repl
`);
}

function formatError(err: unknown, inputFile: string): string {
  if (err instanceof PrismError) {
    return err.format(inputFile);
  }
  const msg = err instanceof Error ? err.message : String(err);
  return `\nprism: ${inputFile}: error — ${msg}\n`;
}

function createTempCleanup(tmpFile: string): () => void {
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      if (fs.existsSync(tmpFile)) fs.rmSync(tmpFile, { force: true });
    } catch {
    }
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    cleanup();
    process.exit(signal === "SIGINT" ? 130 : 143);
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);
  process.once("exit", cleanup);

  return () => {
    cleanup();
    process.removeListener("SIGINT", handleSignal);
    process.removeListener("SIGTERM", handleSignal);
    process.removeListener("exit", cleanup);
  };
}

function assertNoInvalidGeneratedCode(code: string): void {
  if (/\blet;\b/.test(code) || /(^|\n)\s*let;\s*(\n|$)/.test(code)) {
    throw new Error(
      'Generated code contains invalid "let;" — a VariableDeclaration reached the code generator without a name.',
    );
  }
}

function summarizeNodeError(stderr: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const important = lines.find((l) =>
    /^(ReferenceError|SyntaxError|TypeError|RangeError|Error):/.test(l),
  );
  if (important) return important;
  if (lines.length > 0) return lines[0];
  return "runtime error";
}

function runGeneratedCode(code: string): void {
  const tmp = path.join(process.cwd(), `.prism_tmp_${Date.now()}.mjs`);
  const stopCleanup = createTempCleanup(tmp);

  try {
    assertNoInvalidGeneratedCode(code);
    fs.writeFileSync(tmp, code, "utf-8");

    const result = spawnSync(process.execPath, [tmp], {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
      shell: false,
    });

    if (result.stdout) process.stdout.write(result.stdout);

    if (result.error) throw new Error(result.error.message);

    if ((result.status ?? 0) !== 0) {
      const msg = summarizeNodeError(result.stderr || "");
      throw new Error(msg);
    }
  } finally {
    stopCleanup();
  }
}

function cmdCompileOrRun(
  command: "compile" | "run",
  inputFile: string,
  source: string,
  emitJs: boolean,
  printAst: boolean,
  outFile: string | null,
): void {
  const result = transpile(source, {
    emitTypes: command === "compile" ? !emitJs : false,
    filename: inputFile,
  });

  if (printAst) {
    console.error("--- AST ---");
    console.error(JSON.stringify(result.ast, null, 2));
  }

  const output = result.code;

  if (outFile) {
    fs.writeFileSync(outFile, output, "utf-8");
    console.log(`✅  Compiled to ${outFile}`);
  } else if (command === "compile") {
    process.stdout.write(output + "\n");
  }

  if (command === "run") {
    assertNoInvalidGeneratedCode(output);
    runGeneratedCode(output);
  }
}

function cmdCheck(inputFile: string, source: string, printAst: boolean): void {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  if (printAst) console.log(JSON.stringify(ast, null, 2));
  console.log(`✅  ${inputFile}: parsed successfully — no syntax errors`);
}

function cmdFmt(inputFile: string, source: string, writeBack: boolean): void {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const formatter = new Formatter();
  const formatted = formatter.format(ast);

  if (writeBack) {
    fs.writeFileSync(inputFile, formatted, "utf-8");
    console.log(`✅  ${inputFile}: formatted`);
  } else {
    process.stdout.write(formatted);
  }
}

function cmdLint(inputFile: string, source: string): void {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const linter = new Linter();
  const diagnostics = linter.lint(ast);

  const output = formatDiagnostics(diagnostics, inputFile);
  console.log(output);

  const hasErrors = diagnostics.some((d) => d.severity === "error");
  if (hasErrors) process.exit(1);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const [command, ...rest] = args;

  if (command === "repl") {
    startRepl();
    return;
  }

  const emitJs = rest.includes("--js");
  const printAst = rest.includes("--ast");
  const writeBack = rest.includes("--write");
  const outIdx = rest.indexOf("--out");
  const outFile = outIdx !== -1 ? rest[outIdx + 1] : null;

  const inputFile = rest.find(
    (a) =>
      !a.startsWith("--") &&
      (outIdx === -1 || rest.indexOf(a) !== outIdx + 1),
  );

  if (!inputFile) {
    console.error(`prism: error — no input file specified`);
    console.error(`       run 'prism --help' for usage`);
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`prism: error — file not found: ${inputFile}`);
    process.exit(1);
  }

  const source = fs.readFileSync(inputFile, "utf-8");

  try {
    switch (command) {
      case "compile":
      case "run":
        cmdCompileOrRun(command, inputFile, source, emitJs, printAst, outFile);
        break;

      case "check":
        cmdCheck(inputFile, source, printAst);
        break;

      case "fmt":
        cmdFmt(inputFile, source, writeBack);
        break;

      case "lint":
        cmdLint(inputFile, source);
        break;

      default:
        console.error(`prism: unknown command '${command}'`);
        console.error(`       run 'prism --help' for available commands`);
        process.exit(1);
    }
  } catch (err) {
    process.stderr.write(formatError(err, inputFile));
    process.exit(1);
  }
}

main();