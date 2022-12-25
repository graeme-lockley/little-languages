This project is a custom bytecode interpreter (BCI) to execute compiled
statically typed lambda calculus (STLC) efficiently. This interpreter has the
following characteristics:

- stack based rather than register based - this greatly simplifies the
  compilation and execution
- each value in BCI is tagged - this greatly simplifies debugging, printing of
  values and garbage collection
- support for closures - STLC is a higher-order functional language
- garbage collection is built-in to the BCI

## Instruction Set

The BCI has the following instructions:

| Instruction        | Description                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- |
| `PUSH_TRUE`        | Push `true` onto the stack                                                            |
| `PUSH_FALSE`       | Push `false` onto the stack                                                           |
| `PUSH_INT` `n`     | Push the literal integer `n` onto the stack                                           |
| `PUSH_VAR` `n` `m` | Push the variable `n` activation records and `m` offset into the stack onto the stack |
| `PUSH_CLOSURE` `n` | Push a closure referenced by the offset `n` onto the stack                            |
| `PUSH_TUPLE` `n`   | Push a tuple onto the stack using the top `n` values to populate the tuple            |
| `ADD`              | Add two numbers on the stack                                                          |
| `SUB`              | Subtract two numbers on the stack                                                     |
| `MUL`              | Multiply two numbers on the stack                                                     |
| `DIV`              | Divide two numbers on the stack                                                       |
| `EQ`               | Compare two numbers on the stack                                                      |
| `JMP` `n`          | Jump to the `n` position                                                              |
| `JMP_TRUE` `n`     | Jump to a position if the top of the stack is true                                    |
| `SWAP_CALL`        | Call the closure just below the top of the stack removing the closure.                |
| `ENTER` `n`        | enter a function reserving `n` variable positions                                     |
| `RET`              | Return from a function returns the top of stack as a result                           |
| `STORE_VAR` `n`    | Store the value from the stack into the variable position `n`                         |

## Illustration Compilation

```
let
  add = \a -> (\b -> a + b) ;
  incr = add 1
in
  incr 10
```

The above STLC program is compiled into the following BCI program:

```
:$$main
  ENTER 2
  PUSH_CLOSURE $$add
  STORE_VAR 0
  PUSH_VAR 0 0
  PUSH_INT 1
  SWAP_CALL
  STORE_VAR 1
  PUSH_VAR 0 1
  PUSH_INT 10
  SWAP_CALL
  RET

:$$add
  ENTER 1
  STORE_VAR 0
  PUSH_CLOSURE $$add1
  RET

:$$add1
  ENTER 1
  STORE_VAR 0
  PUSH_VAR 1 0
  PUSH_VAR 0 0
  ADD
  RET
```

A slightly more complex example given that we have a recursive function
referencing an enclosing closure.

```
let
  sum n =
    let rec total i = 
      if (i == n) i else i + (total (i + 1))
    in total 0
in
  sum 3
```

The above STLC program is compiled into the following BCI program:

```
  ENTER 1
  PUSH_CLOSURE $$sum
  STORE_VAR 0
  PUSH_VAR 0 0           -- $$sum
  PUSH_INT 3
  SWAP_CALL
  RET

:$$sum
  ENTER 2
  STORE_VAR 0
  PUSH_CLOSURE $$total
  STORE_VAR 1
  PUSH_VAR 0 1           -- $$total
  PUSH_INT 0
  SWAP_CALL
  RET

:$$total
  ENTER 1
  STORE_VAR 0
  PUSH_VAR 0 0           -- i
  PUSH_VAR 1 0           -- n
  EQ
  JMP_TRUE $$if-then
  PUSH_VAR 0 0           -- i
  PUSH_VAR 1 1           -- $$total
  PUSH_VAR 0 0           -- i
  PUSH_INT 1
  ADD
  SWAP_CALL
  ADD
  JMP $$if-continue

:$$if-then
  PUSH_VAR 0 0           -- i

:$$if-continue
  RET
```
