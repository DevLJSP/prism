import { ASTNode, MatchCase } from './tokens'

const TYPE_MAP: Record<string, string> = {
  int: 'number',
  float: 'number',
  bool: 'boolean',
  string: 'string',
  void: 'void',
  any: 'any',
}

function mapType(t: string | undefined): string {
  if (!t) return ''
  if (t.endsWith('[]')) return (TYPE_MAP[t.slice(0, -2)] ?? t.slice(0, -2)) + '[]'
  return TYPE_MAP[t] ?? t
}

export class CodeGenerator {
  private indentLevel = 0
  private emitTypes: boolean

  constructor(options: { emitTypes?: boolean } = {}) {
    this.emitTypes = options.emitTypes ?? true
  }

  private ind(): string { return '  '.repeat(this.indentLevel) }

  private block(fn: () => string[]): string[] {
    this.indentLevel++
    const lines = fn()
    this.indentLevel--
    return lines
  }

  generate(node: ASTNode): string {
    return this.genNode(node).join('\n')
  }

  private genNode(node: ASTNode): string[] {
    switch (node.type) {
      case 'Program':
        return node.body.flatMap(n => this.genNode(n))

      case 'ImportDeclaration': {
        const { defaultImport, namedImports, path } = node
        const parts: string[] = []
        if (defaultImport) parts.push(defaultImport)
        if (namedImports.length > 0) parts.push(`{ ${namedImports.join(', ')} }`)
        return [`import ${parts.join(', ')} from "${path}";`]
      }

      case 'VariableDeclaration': {
        const kw = node.isMutable ? 'let' : 'const'
        const typePart = this.emitTypes && node.typeAnnotation
          ? `: ${mapType(node.typeAnnotation)}`
          : ''
        const initPart = node.initializer ? ` = ${this.genExpr(node.initializer)}` : ''
        return [`${this.ind()}${kw} ${node.name}${typePart}${initPart};`]
      }

      case 'FunctionDeclaration': {
        const sig = this.buildFnSignature(node.name, node.params, node.returnType)
        const body = this.block(() => node.body.flatMap(s => this.genNode(s)))
        return [`${this.ind()}function ${sig} {`, ...body, `${this.ind()}}`]
      }

      case 'ClassDeclaration': {
        const lines: string[] = [`${this.ind()}class ${node.name} {`]
        this.indentLevel++

        for (const prop of node.properties) {
          const vis = prop.visibility === 'priv' ? 'private' : 'public'
          const typePart = this.emitTypes && prop.typeAnnotation ? `: ${mapType(prop.typeAnnotation)}` : ''
          const initPart = prop.initializer ? ` = ${this.genExpr(prop.initializer)}` : ''
          lines.push(`${this.ind()}${vis} ${prop.name}${typePart}${initPart};`)
        }

        if (node.properties.length > 0 && node.methods.length > 0) lines.push('')

        for (const method of node.methods) {
          const vis = method.visibility === 'priv' ? 'private' : 'public'
          const sig = this.buildFnSignature(method.name, method.params, method.returnType)
          const body = this.block(() => method.body.flatMap(s => this.genNode(s)))
          lines.push(`${this.ind()}${vis} ${sig} {`)
          lines.push(...body)
          lines.push(`${this.ind()}}`)
          lines.push('')
        }

        this.indentLevel--
        lines.push(`${this.ind()}}`)
        return lines
      }

      case 'IfStatement': {
        const cond = this.genExpr(node.condition)
        const thenLines = this.block(() => node.thenBranch.flatMap(s => this.genNode(s)))
        const result = [`${this.ind()}if (${cond}) {`, ...thenLines, `${this.ind()}}`]

        if (node.elseBranch) {
          if (node.elseBranch.length === 1 && node.elseBranch[0].type === 'IfStatement') {
            // else if chain
            const inner = this.genNode(node.elseBranch[0])
            result[result.length - 1] = result[result.length - 1] + ' else ' + inner[0].trimStart()
            result.push(...inner.slice(1))
          } else {
            const elseLines = this.block(() => node.elseBranch!.flatMap(s => this.genNode(s)))
            result[result.length - 1] += ' else {'
            result.push(...elseLines, `${this.ind()}}`)
          }
        }

        return result
      }

      case 'MatchStatement': {
        const lines: string[] = [`${this.ind()}switch (${this.genExpr(node.expression)}) {`]
        this.indentLevel++

        for (const c of node.cases) {
          const label = c.pattern === 'default'
            ? 'default:'
            : `case ${this.genPattern(c.pattern)}:`
          lines.push(`${this.ind()}${label} {`)
          const body = this.block(() => c.body.flatMap(s => this.genNode(s)))
          lines.push(...body)
          lines.push(`${this.ind()}  break;`)
          lines.push(`${this.ind()}}`)
        }

        this.indentLevel--
        lines.push(`${this.ind()}}`)
        return lines
      }

      case 'ForStatement': {
        const iter = this.genExpr(node.iterable)
        const body = this.block(() => node.body.flatMap(s => this.genNode(s)))
        return [`${this.ind()}for (const ${node.variable} of ${iter}) {`, ...body, `${this.ind()}}`]
      }

      case 'WhileStatement': {
        const cond = this.genExpr(node.condition)
        const body = this.block(() => node.body.flatMap(s => this.genNode(s)))
        return [`${this.ind()}while (${cond}) {`, ...body, `${this.ind()}}`]
      }

      case 'ReturnStatement':
        return [`${this.ind()}return${node.value ? ' ' + this.genExpr(node.value) : ''};`]

      case 'ThrowStatement':
        return [`${this.ind()}throw ${this.genExpr(node.expression)};`]

      case 'ExpressionStatement':
        return [`${this.ind()}${this.genExpr(node.expression)};`]

      default:
        return [`/* unhandled node: ${(node as ASTNode).type} */`]
    }
  }

  private buildFnSignature(
    name: string,
    params: { name: string; typeAnnotation?: string }[],
    returnType?: string
  ): string {
    const paramStr = params.map(p => {
      const t = this.emitTypes && p.typeAnnotation ? `: ${mapType(p.typeAnnotation)}` : ''
      return `${p.name}${t}`
    }).join(', ')
    const retStr = this.emitTypes && returnType ? `: ${mapType(returnType)}` : ''
    return `${name}(${paramStr})${retStr}`
  }

  private genPattern(pattern: MatchCase['pattern']): string {
    if (typeof pattern === 'string') return JSON.stringify(pattern)
    if (typeof pattern === 'boolean') return String(pattern)
    return String(pattern)
  }

  genExpr(node: ASTNode): string {
    switch (node.type) {
      case 'Identifier':       return node.name
      case 'StringLiteral':    return JSON.stringify(node.value)
      case 'NumberLiteral':    return String(node.value)
      case 'BooleanLiteral':   return String(node.value)
      case 'NullLiteral':      return 'null'
      case 'BinaryExpression': return `${this.genExpr(node.left)} ${node.operator} ${this.genExpr(node.right)}`
      case 'UnaryExpression':  return `${node.operator}${this.genExpr(node.operand)}`
      case 'Assignment':       return `${this.genExpr(node.target)} = ${this.genExpr(node.value)}`
      case 'PropertyAccess':   return `${this.genExpr(node.object)}.${node.property}`
      case 'IndexAccess':      return `${this.genExpr(node.object)}[${this.genExpr(node.index)}]`
      case 'CallExpression':   return `${node.callee}(${node.args.map(a => this.genExpr(a)).join(', ')})`
      case 'MethodCall':       return `${this.genExpr(node.object)}.${node.method}(${node.args.map(a => this.genExpr(a)).join(', ')})`
      case 'NewExpression':    return `new ${node.className}(${node.args.map(a => this.genExpr(a)).join(', ')})`
      case 'ArrayExpression':  return `[${node.elements.map(e => this.genExpr(e)).join(', ')}]`
      case 'ObjectExpression': return `{ ${node.properties.map(p => `${p.key}: ${this.genExpr(p.value)}`).join(', ')} }`
      default: return `/* expr: ${(node as ASTNode).type} */`
    }
  }
}