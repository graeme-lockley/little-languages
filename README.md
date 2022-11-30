# Implemented Type Inference

Type inference is tough - really tough! It is so easy to get properly confused and lost. This repo is my type inference scratch pad where I try out different implementations in different languages for different constructs.

Essentially all implementations are [Hindley-Milner](https://en.wikipedia.org/wiki/Hindley–Milner_type_system) based and seeded from https://github.com/sdiehl/write-you-a-haskell.

## STLC - Simple Typed Lambda Calculus

STLC is helpful in getting the type inference engine working without the clutter of complexity.  This language has the following characteristics:

- Bool, Int and higher-order function data types
- Lambda functions
- Explicit recursive functions using `let rec`

The bits that I found most helpful with this project is:

- Determining how to infer `let rec` - the literature often implies that this is trivial however it is certainly not trivial for a practitioner given the subtleties that need to be worked through.
- When to solve over the constraints and when to defer - this is material in getting the most general type solution.

https://github.com/graeme-lockley/typed-lambda-calculus-deno/blob/78341303affc0ace0b5d0327b1ea8b28cf6f7a90/stlc/Grammar.llgd?plain=1

A [Deno](./deno-stlc/) and [Kotlin](/kotlin-stlc/) implementation have been developed for this language.

## TLCA - Typed Lambda Calculus with Abstract Data Types

TLCA is helpful in understanding how to implement abstract data types (ADT) and pattern matching.  The language has the following characteristics:

- Unit, Bool, Int, String, higher-order functions, tuples and abstract data types
- Lambda functions
- Pattern matching
- Declaration based rather than expression based

The implementations include a REPL with all REPLs exhibiting the same behavior.
