This project is a custom byte code interpreter (BCI) to execute compiled
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

| Instruction    | Description                                                 |
| -------------- | ----------------------------------------------------------- |
| `PUSH_TRUE`    | Push `true` onto the stack                                  |
| `PUSH_FALSE`   | Push `false` onto the stack                                 |
| `PUSH_INT`     | Push a literal integer into onto the stack                  |
| `PUSH_VAR`     | Push a variable onto the stack                              |
| `PUSH_CLOSURE` | Push a closure onto the stack                               |
| `POP`          | Pop a value from the stack and discard the result           |
| `STORE_VAR`        | Store a value from the stack into a variable                |
| `ADD`          | Add two numbers on the stack                                |
| `SUB`          | Subtract two numbers on the stack                           |
| `MUL`          | Multiply two numbers on the stack                           |
| `DIV`          | Divide two numbers on the stack                             |
| `EQ`           | Compare two numbers on the stack                            |
| `LT`           | Compare two numbers on the stack                            |
| `GT`           | Compare two numbers on the stack                            |
| `LE`           | Compare two numbers on the stack                            |
| `GE`           | Compare two numbers on the stack                            |
| `JMP`          | Jump to a position                                             |
| `JMP_TRUE`     | Jump to a position if the top of the stack is zero             |
| `JMP_FALSE`    | Jump to a position if the top of the stack is not zero         |
| `CALL`         | call the closure on the top of the stack                    |
| `ENTER`        | enter a function                                            |
| `RET`          | Return from a function returns the top of stack as a result |

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
  ENTER 2
  PUSH_CLOSURE $$add
  STORE_VAR 0
  PUSH_CLOSURE $$incr
  STORE_VAR 1
  PUSH_INT 10
  PUSH_VAR 0 1
  CALL
  RET

:$$add
  ENTER 2
  STORE_VAR 0
  PUSH_CLOSURE $$add_1
  STORE_VAR 1
  PUSH_VAR 0 1
  CALL
  RET

:$$add_1
  ENTER 1
  STORE_VAR 0
  PUSH_VAR 1 0
  PUSH_VAR 0 0
  ADD
  RET

:$$incr
  PUSH_INT 1
  PUSH_VAR 1 0
  CALL
  RET
```

A slightly more complex example given that we have a recursive function referencing an enclosing closure.

```
let
  sum = \n ->
    let rec total = 
      \i -> if (i == n) i else i + (total (i + 1))
    in total 0
in
  sum 3
```

The above STLC program is compiled into the following BCI program:

```

  ENTER 1
  PUSH_CLOSURE $$sum
  STORE_VAR 0
  PUSH_INT 6
  PUSH_VAR 0 0
  CALL
  RET

:$$sum
  ENTER 2
  STORE_VAR 0
  PUSH_CLOSURE $$total
  STORE_VAR 1
  PUSH_INT 0
  PUSH_VAR 0 1
  CALL
  RET

:$$total
  ENTER 1
  STORE_VAR 0
  PUSH_VAR 0 0
  PUSH_VAR 1 0
  EQ
  JMP_TRUE $$total_if_true
  PUSH_VAR 0 0
  PUSH_VAR 0 0
  PUSH_INT 1
  ADD
  PUSH_VAR 1 1
  CALL
  ADD
  RET

:$$total_if_true  
  PUSH_VAR 0 0
  RET
```