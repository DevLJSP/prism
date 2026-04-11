import * as readline from "readline";
import { transpile } from "./index";
import { PrismError } from "./lexer";

const REPL_BANNER = `
 ╔═══════════════════════════════════════╗
 ║  Prism REPL  v0.1.5                   ║
 ║  Type 'exit' or Ctrl+C to quit        ║
 ║  Type '.help' for available commands  ║
 ╚═══════════════════════════════════════╝
`;

const HELP_TEXT = `
Available REPL commands:

  .help      Show this help message
  .clear     Clear the input buffer
  .reset     Reset all state (clears defined variables/functions)
  .ast       Toggle AST printing for next input
  exit       Quit the REPL

Prism code is evaluated line-by-line.
Multi-line input: open a '{' block and press Enter — the REPL
will keep reading until all braces are balanced.

Examples:

  prism> final int x = 42
  prism> log(x)
  42

  prism> fn add(int a, int b) -> int {
    ...>   shine a + b
    ...> }
  prism> log(add(3, 4))
  7
`;

function buildEvalContext(): string {
  return `"use strict";
const __prism_out = [];
const __console = {
  log: (...a) => __prism_out.push(a.map(v => typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)).join(" ")),
  error: (...a) => __prism_out.push("[error] " + a.join(" ")),
  warn: (...a) => __prism_out.push("[warn] " + a.join(" ")),
  info: (...a) => __prism_out.push("[info] " + a.join(" ")),
};
`;
}

function patchConsole(code: string): string {
  return code.replace(/\bconsole\b/g, "__console");
}

function evalSnippet(
  code: string,
  stateVars: Map<string, unknown>,
): { output: string[]; newState: Map<string, unknown>; error?: string } {
  const stateSetup = Array.from(stateVars.entries())
    .map(([k, v]) => `let ${k} = ${JSON.stringify(v)};`)
    .join("\n");

  const fullCode = buildEvalContext() + stateSetup + "\n" + code + "\n__prism_out";

  try {
    const fn = new Function(fullCode);
    const output: string[] = fn() as string[];
    return { output: output ?? [], newState: stateVars };
  } catch (e) {
    return {
      output: [],
      newState: stateVars,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function compileSnippet(source: string): { ok: true; code: string } | { ok: false; error: string } {
  try {
    const result = transpile(source, { emitTypes: false });
    return { ok: true, code: patchConsole(result.code) };
  } catch (e) {
    if (e instanceof PrismError) {
      return { ok: false, error: e.format("<repl>").trim() };
    }
    return { ok: false, error: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function countBraces(text: string): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === inStr && text[i - 1] !== "\\") inStr = null;
    } else if (ch === '"' || ch === "'") {
      inStr = ch;
    } else if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
    }
  }
  return depth;
}

export function startRepl(): void {
  console.log(REPL_BANNER);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "prism> ",
    terminal: process.stdout.isTTY,
  });

  let buffer = "";
  let braceDepth = 0;
  let printAst = false;
  const stateVars = new Map<string, unknown>();

  const setPrompt = () => {
    rl.setPrompt(braceDepth > 0 ? "  ...> " : "prism> ");
  };

  setPrompt();
  rl.prompt();

  rl.on("line", (line: string) => {
    const trimmed = line.trim();

    if (trimmed === "exit" || trimmed === "quit") {
      console.log("Goodbye!");
      rl.close();
      process.exit(0);
    }

    if (braceDepth === 0) {
      if (trimmed === ".help") {
        console.log(HELP_TEXT);
        rl.prompt();
        return;
      }

      if (trimmed === ".clear") {
        buffer = "";
        braceDepth = 0;
        console.log("Buffer cleared.");
        setPrompt();
        rl.prompt();
        return;
      }

      if (trimmed === ".reset") {
        buffer = "";
        braceDepth = 0;
        stateVars.clear();
        console.log("State reset.");
        setPrompt();
        rl.prompt();
        return;
      }

      if (trimmed === ".ast") {
        printAst = !printAst;
        console.log(`AST printing ${printAst ? "enabled" : "disabled"}.`);
        rl.prompt();
        return;
      }

      if (trimmed === "") {
        rl.prompt();
        return;
      }
    }

    buffer += (buffer ? "\n" : "") + line;
    braceDepth = countBraces(buffer);

    if (braceDepth > 0) {
      setPrompt();
      rl.prompt();
      return;
    }

    const source = buffer.trim();
    buffer = "";
    braceDepth = 0;
    setPrompt();

    if (!source) {
      rl.prompt();
      return;
    }

    if (printAst) {
      try {
        const { Lexer } = require("./lexer");
        const { Parser } = require("./parser");
        const tokens = new Lexer(source).tokenize();
        const ast = new Parser(tokens).parse();
        console.log(JSON.stringify(ast, null, 2));
      } catch {
      }
    }

    const compiled = compileSnippet(source);
    if (!compiled.ok) {
      console.error(compiled.error);
      rl.prompt();
      return;
    }

    const { output, error } = evalSnippet(compiled.code, stateVars);

    if (error) {
      console.error(`[runtime error] ${error}`);
    } else if (output.length > 0) {
      for (const line of output) {
        console.log(line);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nGoodbye!");
    process.exit(0);
  });

  rl.on("SIGINT", () => {
    if (buffer.trim()) {
      console.log("\nBuffer cleared. Press Ctrl+C again to exit.");
      buffer = "";
      braceDepth = 0;
      setPrompt();
      rl.prompt();
    } else {
      console.log("\nGoodbye!");
      process.exit(0);
    }
  });
}