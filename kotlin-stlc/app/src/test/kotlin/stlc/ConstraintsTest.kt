package stlc

import kotlin.test.Test
import kotlin.test.assertEquals

class ConstraintsTest {
    @Test
    fun solve1() {
        assertType(
            TArr(typeInt, TArr(typeInt, TArr(typeInt, typeInt))),
            "\\x -> \\y -> \\z -> x + y + z"
        )
    }

    @Test
    fun solve2() {
        assertType(
            TArr(
                TArr(TVar("V4"), TVar("V5")),
                TArr(
                    TArr(TVar("V3"), TVar("V4")),
                    TArr(TVar("V3"), TVar("V5"))
                )
            ),
            "\\f -> \\g -> \\x -> f (g x)"
        )
    }

    @Test
    fun solve3() {
        assertType(
            TArr(
                TArr(TVar("V6"), TVar("V7")),
                TArr(
                    TArr(TVar("V8"), TVar("V6")),
                    TArr(TVar("V8"), TVar("V7"))
                )
            ),
            "let compose = \\f -> \\g -> \\x -> f (g x) in compose"
        )
    }

    @Test
    fun solve4() {
        assertType(
            typeInt,
            "let f = (\\x -> x) in let g = (f True) in f 3"
        )
    }

    @Test
    fun solve5() {
        assertType(
            TArr(TVar("V2"), TVar("V2")),
            "let identity = \\n -> n in identity"
        )
    }

    @Test
    fun solve5a() {
        assertType(
            typeInt,
            "let rec identity = \\n -> n; v = identity 10 in v"
        )
    }

    @Test
    fun solve6() {
        assertType(
            typeInt,
            "let add a b = a + b; succ = add 1 in succ 10"
        )
    }

    @Test
    fun solve7() {
        assertType(
            TArr(typeInt, typeInt),
            "let rec fact n = if (n == 0) 1 else fact (n - 1) * n in fact"
        )
    }

    @Test
    fun solve8() {
        assertType(
            TArr(typeInt, typeBool),
            "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd"
        )
    }

    @Test
    fun solve9() {
        assertType(
            typeInt,
            "let rec a = b + 1; b = a + 1 in a"
        )
    }

    private fun assertType(expected: Type, expression: String) {
        val (constraints, type) = infer(
            emptyTypeEnv,
            parse(expression)
        )

        assertEquals(expected, type.apply(constraints.solve()))
    }
}
