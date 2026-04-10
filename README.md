![Human Written](https://img.shields.io/badge/100%25-Human_Written-brightgreen)

# Prism

Prism is a small, expressive language designed to transpile into TypeScript or JavaScript. It supports functions, classes, control flow, imports, typed variables, arrays, objects, and error handling.

![npm](https://img.shields.io/npm/v/prism-lang)
![downloads](https://img.shields.io/npm/dm/prism-lang)
## Status

Prism is a work in progress. The syntax below is based on the current tokenizer and AST structure.

## Features

* Typed variables and function signatures
* Mutable and immutable bindings
* Functions and methods
* Classes with public and private members
* Conditionals
* Pattern matching
* `while` and `for` loops
* Arrays and objects
* Imports
* `new` expressions
* `try` / `catch` and `throw`
* Unary, binary, compound, and nullish operators

## Installation

```bash
npm install
npm run build
```

## CLI

Prism includes a command-line tool.

To use it, first use:
```bash
npm link
```

```bash
prism compile file.prism
prism run file.prism
prism check file.prism
```

### Options

```bash
--js        Emit plain JavaScript instead of typed output
--ast       Print the AST as JSON
--out <file> Write output to a file
--help      Show help
```

## Basic Syntax

### Variables

Use `mut` for mutable variables and `final` for immutable variables.

```prism
final name: string = "Prism"
mut count: int = 0
```

Type annotations are optional when the compiler can infer them.

```prism
mut value = 10
```

### Functions

```prism
fn greet(name: string): string {
  return "Hello, " + name
}
```

Functions can also return nothing:

```prism
fn logMessage(message: string): void {
  print(message)
}
```

### Conditionals

```prism
if count > 10 {
  print("high")
} else {
  print("low")
}
```

### While Loops

```prism
while count < 10 {
  count += 1
}
```

### For Loops

```prism
for item in items {
  print(item)
}
```

### Match Statements

```prism
match status {
  "ok" => print("success")
  "error" => print("failed")
  default => print("unknown")
}
```

## Functions and Calls

```prism
fn add(a: int, b: int): int {
  return a + b
}

print(add(2, 3))
```

## Classes

Prism supports classes with public and private members.

```prism
class User {
  pub name: string
  priv token: string

  pub fn getName(): string {
    return this.name
  }

  priv fn setToken(token: string): void {
    this.token = token
  }
}
```

### Creating Instances

```prism
mut user = new User("Alice")
```

## Imports

```prism
use fs
use { readFile, writeFile } from "fs"
use path from "path"
```

## Arrays

```prism
mut numbers = [1, 2, 3]
print(numbers[0])
```

## Objects

```prism
mut person = {
  name: "Alice",
  age: 12
}
```

## Operators

Prism supports:

* Arithmetic: `+`, `-`, `*`, `/`
* Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
* Logical: `!`, `&&`, `||`
* Nullish: `??`
* Assignment: `=`, `+=`, `-=`, `*=`, `/=`
* Arrow syntax: `->`, `=>`

## Literals

```prism
true
false
null
"hello"
123
12.5
```

## Types

Prism currently recognizes these types:

* `string`
* `int`
* `float`
* `bool`
* `void`
* `any`

## Error Handling

```prism
try {
  riskyCall()
} catch err {
  print(err)
}
```

Throw an error:

```prism
throw "Something went wrong"
```

## AST Overview

The parser produces an AST with nodes such as:

* `Program`
* `VariableDeclaration`
* `FunctionDeclaration`
* `ClassDeclaration`
* `MethodDeclaration`
* `CallExpression`
* `MethodCall`
* `NewExpression`
* `IfStatement`
* `MatchStatement`
* `WhileStatement`
* `ForStatement`
* `TryCatchStatement`
* `ReturnStatement`
* `Assignment`
* `CompoundAssignment`
* `ArrayExpression`
* `ObjectExpression`

## Example Program

```prism
use { readFile } from "fs"

final appName: string = "Prism"
mut counter: int = 0

fn increment(value: int): int {
  return value + 1
}

while counter < 3 {
  counter += 1
}

if counter == 3 {
  print(appName)
} else {
  print("not ready")
}
```

## Project Structure

A typical Prism project may include:

```bash
src/
  lexer.ts
  parser.ts
  index.ts
  cli.ts
examples/
  example.prism
```

## Notes

* Prism is transpiled, not interpreted directly.
* The exact syntax may evolve as the language grows.
* Some built-in function names such as `print` may depend on your runtime or transpiler output.

## License

Add your project license here.
