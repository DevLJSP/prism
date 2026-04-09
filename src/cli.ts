#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import { transpile } from './index'

const BANNER = `
 ██████╗ ██████╗ ██╗███████╗███╗   ███╗
 ██╔══██╗██╔══██╗██║██╔════╝████╗ ████║
 ██████╔╝██████╔╝██║███████╗██╔████╔██║
 ██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║
 ██║     ██║  ██║██║███████║██║ ╚═╝ ██║
 ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝
 v0.1.0 — "Light bends. Your code doesn't have to."
`

function printHelp(): void {
  console.log(BANNER)
  console.log(`Usage: prism <command> [options] [file]

Commands:
  compile <file.prism>   Transpile to TypeScript
  run     <file.prism>   Transpile and run with Node
  check   <file.prism>   Parse and report errors only

Options:
  --js          Emit plain JavaScript (no type annotations)
  --ast         Print the AST as JSON
  --out <file>  Write output to file instead of stdout
  --help        Show this message
`)
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help')) {
    printHelp()
    process.exit(0)
  }

  const [command, ...rest] = args
  const emitJs = rest.includes('--js')
  const printAst = rest.includes('--ast')
  const outIdx = rest.indexOf('--out')
  const outFile = outIdx !== -1 ? rest[outIdx + 1] : null

  // Find the input file (first non-flag argument)
  const inputFile = rest.find(a => !a.startsWith('--') && rest.indexOf(a) !== outIdx + 1)

  if (!inputFile) {
    console.error('Error: No input file specified.')
    process.exit(1)
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`)
    process.exit(1)
  }

  const source = fs.readFileSync(inputFile, 'utf-8')

  try {
    const result = transpile(source, { emitTypes: !emitJs })

    if (command === 'check') {
      console.log(`✅ ${inputFile} parsed successfully.`)
      if (printAst) console.log(JSON.stringify(result.ast, null, 2))
      process.exit(0)
    }

    if (command === 'compile' || command === 'run') {
      const output = result.code

      if (outFile) {
        fs.writeFileSync(outFile, output, 'utf-8')
        console.log(`✅ Compiled to ${outFile}`)
      } else if (command === 'compile') {
        process.stdout.write(output + '\n')
      }

      if (printAst) {
        console.error('--- AST ---')
        console.error(JSON.stringify(result.ast, null, 2))
      }

      if (command === 'run') {
        // Write temp file and run with Node
        const tmp = path.join(process.cwd(), `.prism_tmp_${Date.now()}.js`)
        const jsResult = transpile(source, { emitTypes: false })
        fs.writeFileSync(tmp, jsResult.code, 'utf-8')
        try {
          require('child_process').execFileSync('node', [tmp], { stdio: 'inherit' })
        } finally {
          fs.unlinkSync(tmp)
        }
      }
    } else {
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
    }
  } catch (err) {
    console.error(`\n💥 ${(err as Error).message}\n`)
    process.exit(1)
  }
}

main()