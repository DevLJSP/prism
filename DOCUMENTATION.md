# Prism Language Documentation

## Overview

Prism is a statically typed, server-oriented programming language designed to feel familiar to developers coming from TypeScript, Java, and C#. Its core goals are readability, safety, and low boilerplate.

Prism emphasizes:

* Immutability by default
* Explicit mutation
* Clear type annotations
* Server-first standard library design
* Simple, readable syntax

This document describes the current language design as implemented in the Prism parser, lexer, and code generator.

---

## File Format

Prism source files use the `.prism` extension.

Example:

```prism
use http from "http"

fn main() -> void {
  log("Hello, Prism")
}
```

---

## Comments

Prism supports:

### Single-line comments

```prism
// This is a comment
```

### Block comments

```prism
/*
  This is a block comment.
  It can span multiple lines.
*/
```

---

## Keywords

Prism currently recognizes the following keywords:

* `fn`
* `final`
* `mut`
* `class`
* `pub`
* `priv`
* `if`
* `else`
* `match`
* `shine`
* `shatter`
* `for`
* `in`
* `while`
* `use`
* `from`
* `new`
* `true`
* `false`
* `null`
* `string`
* `int`
* `float`
* `bool`
* `void`
* `any`
* `try`
* `catch`

---

## Identifiers

Identifiers are names used for variables, functions, classes, parameters, and properties.

Rules:

* Must start with a letter or underscore
* May contain letters, digits, and underscores after the first character
* Cannot be a reserved keyword

Examples:

```prism
userName
_userId
nextId2
```

---

## Primitive Types

Prism supports the following built-in types:

* `string`
* `int`
* `float`
* `bool`
* `void`
* `any`

### Type mappings in generated JavaScript

* `int` -> `number`
* `float` -> `number`
* `bool` -> `boolean`
* `string` -> `string`
* `void` -> `void`
* `any` -> `any`

### Array types

Array types are written with `[]`.

Example:

```prism
final string[] names = ["Alice", "Bob"]
```

---

## Variables

Prism supports immutable and mutable variable declarations.

### Immutable variables

Use `final` for immutable variables.

```prism
final string name = "Prism"
final int count = 10
```

### Mutable variables

Use `mut` for mutable variables.

```prism
mut int counter = 0
counter += 1
```

### Syntax

```prism
final|mut [type] name = expression
```

The type annotation is optional in some cases if inference is supported by the runtime or code generator.

### Examples

```prism
final greeting = "Hello"
mut attempts = 0
final float pi = 3.14159
```

---

## Functions

Functions are declared with `fn`.

### Basic function

```prism
fn greet(string name) -> string {
  shine "Hello, " + name
}
```

### Void function

```prism
fn logMessage(string message) -> void {
  log(message)
}
```

### Syntax

```prism
fn name(type param, type param2) -> returnType {
  statements
}
```

### Anonymous functions

Prism also supports anonymous functions.

```prism
fn(string value) -> void {
  log(value)
}
```

Anonymous functions can be passed as arguments.

```prism
req.on("end", fn() -> void {
  log("Request ended")
})
```

---

## Return Statements

Prism uses `shine` to return values.

### Example

```prism
fn square(int n) -> int {
  shine n * n
}
```

### Returning nothing

```prism
fn run() -> void {
  shine null
}
```

---

## Throw Statements

Prism uses `shatter` to throw errors.

### Example

```prism
fn fail() -> void {
  shatter "Something went wrong"
}
```

---

## Control Flow

## If / Else

```prism
if isReady {
  log("Ready")
} else {
  log("Not ready")
}
```

### Else if

```prism
if score > 90 {
  log("A")
} else if score > 75 {
  log("B")
} else {
  log("C")
}
```

---

## While Loops

```prism
mut int i = 0
while i < 5 {
  log(i)
  i += 1
}
```

---
## Do‑While Loops

Executes the body **at least once** before checking the condition.

```prism
mut int i = 0
do {
  log(i)
  i += 1
} while (i < 3)
```

---

## C‑Style For Loops

In addition to `for ... in ...`, Prism supports a C‑style `for` loop with initializer, condition, and increment.

```prism
for (mut j = 0; j < 3; j = j + 1) {
  log(j)
}
```

---

## For Loops

Prism uses `for ... in ...` for iteration.

```prism
for user in users {
  log(user.name)
}
```

Generated JavaScript uses `for (const user of users)`.

---

## Match Expressions

`match` provides pattern-based branching.

### Example

```prism
match status {
  "active" => {
    log("Active user")
  },
  "inactive" => {
    log("Inactive user")
  },
  _ => {
    log("Unknown status")
  }
}
```

### Supported patterns

* Strings
* Numbers
* Booleans
* Identifiers
* `_` as default

---

## Imports

Prism uses `use ... from ...` for imports.

### Default import

```prism
use http from "http"
```

### Named import

```prism
use { URL } from "url"
```

### Combined import

```prism
use http, { createServer } from "http"
```

---

## Classes

Prism supports class declarations with public and private members.

### Basic class

```prism
class User {
  final string id
  mut string name
}
```

### Class with methods

```prism
class User {
  final string id
  mut string name

  fn rename(string newName) -> void {
    this.name = newName
  }
}
```

### Visibility

Use `pub` or `priv` before class members.

```prism
class Account {
  pub final string id
  priv mut int balance
}
```

### Properties

Class properties may include:

* A visibility modifier
* A type annotation
* An initializer
* A mutability marker

Example:

```prism
class Post {
  pub final string title
  priv mut int views = 0
}
```

---

## Object Literals

Prism supports object literals similar to JavaScript.

### Example

```prism
final any user = {
  id: 1,
  name: "Alice",
  active: true
}
```

String keys are supported.

```prism
final any headers = {
  "Content-Type": "application/json"
}
```

---

## Arrays

Array literals use square brackets.

```prism
final any items = [1, 2, 3]
final string[] names = ["Alice", "Bob"]
```

---

## New Expressions

Use `new` to create class instances.

```prism
final User user = new User("u1", "Alice")
```

---

## Property Access

Use dot notation for properties.

```prism
log(user.name)
```

---

## Method Calls

Methods are called with dot syntax.

```prism
user.rename("New Name")
```

---

## Function Calls

```prism
log("Hello")
createUser("Alice", "alice@example.com")
```

---

## Operators

Prism supports the following operators in the current grammar.

### Arithmetic

* `+`
* `-`
* `*`
* `/`
* `%` (remainder/modulo)
* `**` (exponentiation)

### Comparison

* `==`
* `!=`
* `>`
* `<`
* `>=`
* `<=`

### Logical

* `&&`
* `||`
* `!`
* `??`

### Assignment

* `=`
* `+=`
* `-=`
* `*=`
* `/=`

---

## Literals

### Strings

```prism
final string a = "hello"
final string b = 'hello'
```

### Numbers

```prism
final int a = 10
final float b = 3.14
```

### Booleans

```prism
final bool x = true
final bool y = false
```

### Null

```prism
final any value = null
```

---

## Error Handling

Prism supports structured error handling with `try` and `catch`.

### Example

```prism
try {
  final any data = JSON.parse(body)
} catch (err) {
  sendError(res, 400, "Invalid JSON body")
}
```

### Throwing errors

```prism
shatter "Unauthorized access"
```

---

## Runtime Notes

The current implementation includes a lexer, parser, and code generator that translates Prism to JavaScript.

### Current compiler pipeline

1. Lexer converts source text into tokens
2. Parser converts tokens into an AST
3. Code generator emits JavaScript
4. The generated JavaScript is executed by Node.js

---

## Code Generation Behavior

### Variables

* `final` becomes `const`
* `mut` becomes `let`

### Return statements

* `shine expr` becomes `return expr`

### Throw statements

* `shatter expr` becomes `throw new Error(expr)`

### Logs

* `log(expr)` becomes `console.log(expr)`

### Loops

* `for item in items` becomes `for (const item of items)`

---

## Standard Library Concepts

The language is currently designed around a server-first workflow.

Likely standard library areas include:

* HTTP server utilities
* URL parsing
* JSON handling
* Logging
* Environment access
* Error utilities

A future standard library may include stronger abstractions for routing, middleware, and request handling.

---

## Example Program

```prism
use http from "http"
use { URL } from "url"

mut any users = []
mut int nextId = 1

fn createUser(string name, string email) -> any {
  final any user = { id: nextId, name: name, email: email, active: true }
  users.push(user)
  nextId += 1
  shine user
}

fn findUser(int id) -> any {
  for user in users {
    if user.id == id {
      shine user
    }
  }
  shine null
}

fn sendJson(any res, int status, any body) -> void {
  final string json = JSON.stringify(body)
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(json)
}

fn handleRequest(any req, any res) -> void {
  final any parsedUrl = new URL(req.url, "http://localhost:3000")
  final string pathname = parsedUrl.pathname
  final string method = req.method

  if pathname == "/health" && method == "GET" {
    sendJson(res, 200, { ok: true })
    shine null
  }

  sendJson(res, 404, { ok: false, error: "Route not found" })
}

final int PORT = 3000
final any server = http.createServer(handleRequest)

server.listen(PORT, fn() -> void {
  log("Prism server running at http://localhost:" + PORT)
})
```

---

## Current Grammar Summary

### Statements

* Import declaration
* Function declaration
* Class declaration
* If statement
* Match statement
* For statement
* While statement
* Return statement
* Throw statement
* Try/catch statement
* Variable declaration
* Expression statement

### Expressions

* Literals
* Identifiers
* Function calls
* Method calls
* Property access
* Index access
* Arrays
* Objects
* New expressions
* Unary expressions
* Binary expressions
* Assignments

---

## Known Design Notes

The current language design is still evolving. Some features are intentionally minimal or experimental.

Potential future additions:

* Nullable types with `?`
* Optional chaining
* Null coalescing operators with clearer precedence
* Multi-line strings
* Better pattern matching
* Interface declarations
* Generics
* Module aliases
* Async/await support in the parser
* More complete class construction syntax

---

## Style Guidelines

Recommended Prism style:

* Use `final` whenever possible
* Use `mut` only when mutation is necessary
* Prefer explicit types for public APIs
* Keep functions small and readable
* Use `shine` for all returns
* Use `shatter` only for exceptional failures

---

## Minimal Cheat Sheet

```prism
final string name = "Prism"
mut int count = 0

fn add(int a, int b) -> int {
  shine a + b
}

if count > 10 {
  log("large")
}

for item in items {
  log(item)
}

match value {
  1 => { log("one") },
  _ => { log("other") }
}
```

---

## Conclusion

Prism is designed to be a practical, readable, and server-focused language with a familiar syntax and a small, understandable core. Its current implementation already provides a foundation for variables, functions, classes, control flow, pattern matching, and JavaScript code generation.

As the language evolves, this documentation should grow alongside the grammar, runtime, and standard library.
