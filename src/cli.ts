#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { transpile } from "./index";
import { PrismError } from "./lexer";

const BANNER = `
 ██████╗ ██████╗ ██╗███████╗███╗   ███╗
 ██╔══██╗██╔══██╗██║██╔════╝████╗ ████║
 ██████╔╝██████╔╝██║███████╗██╔████╔██║
 ██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║
 ██║     ██║  ██║██║███████║██║ ╚═╝ ██║
 ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝
 v0.1.4 — "Light bends. Your code doesn't have to."
`;

function printHelp(): void {
  console.log(BANNER);
  console.log(`Usage: prism <command> [options] [file]

Commands:
  compile <file.prism>   Transpile to TypeScript
  run     <file.prism>   Transpile and run with Node
  check   <file.prism>   Parse and report errors only

Options:
  --js          Emit plain JavaScript (no type annotations)
  --ast         Print the AST as JSON
  --out <file>   Write output to file instead of stdout
  --help         Show this message
`);
}

function formatError(err: unknown, inputFile: string): string {
  if (err instanceof PrismError) {
    return `\nprism: ${inputFile}:${err.line}: error at "${err.token}" — ${err.detail}\n`;
  }

  const msg = err instanceof Error ? err.message : String(err);
  return `\nprism: ${inputFile}: runtime error — ${msg}\n`;
}

function createTempCleanup(tmpFile: string) {
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    try {
      if (fs.existsSync(tmpFile)) {
        fs.rmSync(tmpFile, { force: true });
      }
    } catch {
      // ignore cleanup errors
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
      'Generated code contains invalid "let;". A VariableDeclaration is reaching the code generator without a name.',
    );
  }
}

function summarizeNodeError(stderr: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const important = lines.find((line) =>
    /^(ReferenceError|SyntaxError|TypeError|RangeError|Error):/.test(line),
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

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    if ((result.status ?? 0) !== 0) {
      const msg = summarizeNodeError(result.stderr || "");
      throw new Error(msg);
    }
  } finally {
    stopCleanup();
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const [command, ...rest] = args;
  const emitJs = rest.includes("--js");
  const printAst = rest.includes("--ast");
  const outIdx = rest.indexOf("--out");
  const outFile = outIdx !== -1 ? rest[outIdx + 1] : null;

  const inputFile = rest.find(
    (a) => !a.startsWith("--") && (outIdx === -1 || rest.indexOf(a) !== outIdx + 1),
  );

  if (!inputFile) {
    console.error("Error: No input file specified.");
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  const source = fs.readFileSync(inputFile, "utf-8");

  try {
    const result = transpile(source, {
      emitTypes: command === "compile" ? !emitJs : false,
    });

    if (command === "check") {
      console.log(`✅ ${inputFile} parsed successfully.`);
      if (printAst) console.log(JSON.stringify(result.ast, null, 2));
      process.exit(0);
    }

    if (command === "compile" || command === "run") {
      const output = result.code;

      if (printAst) {
        console.error("--- AST ---");
        console.error(JSON.stringify(result.ast, null, 2));
      }

      if (outFile) {
        fs.writeFileSync(outFile, output, "utf-8");
        console.log(`✅ Compiled to ${outFile}`);
      } else if (command === "compile") {
        process.stdout.write(output + "\n");
      }

      if (command === "run") {
        assertNoInvalidGeneratedCode(output);
        runGeneratedCode(output);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
    }
  } catch (err) {
    process.stderr.write(formatError(err, inputFile));
    process.exit(1);
  }
}

main();