```ocaml
let rec isOdd = \n -> if (n == 0) False else isEven (n - 1) ;
        isEven = \n -> if (n == 0) True else isOdd (n - 1)

isOdd :: Int -> Bool
isEven :: Int -> Bool
```

Now let's rewrite this to get it into a shape that I can use against fix.  We then have

```ocaml
let f = \ioie -> (
  \n -> if (n == 0) False else ioie[1] (n - 1)
, \n -> if (n == 0) True else ioie[0] (n - 1)
)

f :: (Int -> Bool, Int -> Bool) -> (Int -> Bool, Int -> Bool)
```

The 'problem' with this example is that both `isOdd` and `isEven` have the same signature.  If we assume, for a moment, that they did not then the form we are looking at is

```ocaml
f' :: (S, U) -> (S, U)
```

So I know that the fix operator has the following signature

```ocaml
fix :: (T -> T) -> T
```

Creating a `fix2` we then arrive at the signature

```ocaml
fix2 :: ((S, U) -> (S, U)) -> (S, U)
```

Looking at this closely and replacing `(S, U)` with `T` we end up with the familiar form of

```ocaml
fix2 :: (T -> T) -> T
```

which has the same type signature as `fix`.

The question that now follows is how `fix` can be used to produce constraints that allow the type of mutually recursive functions to be derived.  As always, let's start with the single function.

```ocaml
let rec fact = \n -> if (n == 1) 1 else n * (fact (n - 1))
```

This gets rewritten into

```ocaml
let fact = fix1 (\f -> \n -> if (n == 1) 1 else n * (f (n - 1)))
```

We then infer `\f -> \n -> if (n == 1) 1 else n * (f (n - 1))` into `T`, create a fresh type `S` and add the constraints

```
S -> S ~ T
```

and assign the type `S` to `fact`.

Now let's go back to 

```ocaml
let rec isOdd = \n -> if (n == 0) False else isEven (n - 1) ;
        isEven = \n -> if (n == 0) True else isOdd (n - 1)
```

This get's rewritten into

```ocaml
let f = \ioie -> (
  \n -> if (n == 0) False else ioie[1] (n - 1)
, \n -> if (n == 0) True else ioie[0] (n - 1)
)
```

which we infer into `T`.  We then create the fresh types `S1` and `S2`.  Following this we add the constraints

```
(S1, S2) -> (S1, S2) ~ T
```

Further to that we associate `S1` to `isOdd` and `S2` to `isEven`.  A final consideration is the transformation of the original source where calls to `isEven` and `isOdd` needs to be replaced with `ioie[1]` and `ioie[0]` respectively.  We know that `ioie[1]` and `ioie[0]` will infer `S2` and `S1` respectively.  Rather than transforming the code, binding `isEven` and `isOdd` with `S2` and `S1` prior to inferring the type of `f` would render the same outcome.


# Limitations

A limitation of this strategy is that it does not infer the most general signature for each function.  For example consider the following:

```ocaml
let rec identity n = n ;
        v1 = identity 10 ;
        v2 = identity True
```

These declarations will result in an inference error.  The reason being is that `identity` is typed with `Int` and `Bool`.  The rewrite of this to avoid the inference error would be 

```ocaml
let identity n = n in
  let rec v1 = identity 10 ;
          v2 = identity True
```
