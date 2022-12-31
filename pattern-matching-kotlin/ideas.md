Thinking more and more about language features - I like interfaces and I like binding behaviour to values.

```
value List<a>(hd: a, rest: List<a>?) {
    let length = 1 + (rest?.length | 0)
}

let length<a>(l: List<a>) = l?.length | 0
```

Now to specialise a little further - adding a function to a list of Ints.

```
let sum(l: List<Int>?) = l == null ? 0 : l.hd + sum(l.rest)
```

Now what about attaching this onto `List<a>` itself?

```
value List<a>(hd: a, rest: List<a>?) {
    let length = 1 + (rest?.length | 0)
    let sum<Int> = hd + (rest?.sum | 0)
}
```

or perhaps using a different notation:

```
let List.length = 1 + (rest?.length | 0)
let List.sum<Int> = hd + (rest?.sum | 0)
```

We can then create a value interface that declares something to be "LengthAble".

```
interface Lengthable {
    val length: Int
}
```

