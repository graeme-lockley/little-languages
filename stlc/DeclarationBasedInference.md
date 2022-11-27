A valuable insight for me is that declarations are introduced one at a time into an environment.  I really battled when dealing with

```ocaml
let d1 = e1
  ; d2 = d2
  ; ...
  ; dn = en
 in e
```

The reason for my trouble is that the declaration `di = ei` takes place in the same environment that preceded this statement with the bindings preceding `di` incorporated.  Further to that the inference of `di`'s type happens within the context of an empty collection of constraints.

The reason why this is important is it prevents usage of following declarations being added as further constraints and therefore narrowing the declaration's scheme.  For example

```ocaml
let id = \x -> x
  ; v1 = id 10
  ; v2 = id True
 in (v1, v2)
```

Would result in a unification error if constraints were propagated.  The above declaration is syntactic sugar for the following

```ocaml
let id = \x -> x
 in let v1 = id 10
     in let v2 = id True
        in (v1, v2)
```
