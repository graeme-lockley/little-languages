package stlc

import kotlin.test.Test
import kotlin.test.assertEquals

class ConstraintsTest {
    @Test
    fun `lambda function with arithmetic operators`() {
        assertType(
            "Int -> Int -> Int -> Int",
            "\\x -> \\y -> \\z -> x + y + z"
        )
    }

    @Test
    fun `lambda function composition`() {
        assertType(
            "(V4 -> V5) -> (V3 -> V4) -> V3 -> V5",
            "\\f -> \\g -> \\x -> f (g x)"
        )
    }

    @Test
    fun `returns compose function where compose is defined using lambda`() {
        assertType(
            "(V6 -> V7) -> (V8 -> V6) -> V8 -> V7",
            "let compose = \\f -> \\g -> \\x -> f (g x) in compose"
        )

        assertType(
            "(V9 -> V10) -> (V11 -> V9) -> V11 -> V10",
            "let rec compose = \\f -> \\g -> \\x -> f (g x) in compose"
        )
    }

    @Test
    fun `generalised inferred scheme used in different forms`() {
        assertType(
            "Int",
            "let f = (\\x -> x) in let g = (f True) in f 3"
        )

        assertType(
            "Int",
            "let rec f = (\\x -> x) in let g = (f True) in f 3"
        )

        assertType(
            "Int",
            "let f = (\\x -> x) in let rec g = (f True) in f 3"
        )

        assertType(
            "Int",
            "let rec f = (\\x -> x) in let rec g = (f True) in f 3"
        )
    }

    @Test
    fun `identity declaration and returned`() {
        assertType(
            "V2 -> V2",
            "let identity = \\n -> n in identity"
        )

        assertType(
            "V5 -> V5",
            "let rec identity = \\n -> n in identity"
        )
    }

    @Test
    fun `identity declared and used and returned`() {
        assertType(
            "Int",
            "let identity = \\n -> n; v = identity 10 in v"
        )

        assertType(
            "Int",
            "let rec identity = \\n -> n; v = identity 10 in v"
        )
    }

    @Test
    fun `sequential declarations`() {
        assertType(
            "Int",
            "let identity = \\n -> n in let rec v1 = identity 10; v2 = identity True in v1"
        )

        assertType(
            "Int",
            "let rec identity = \\n -> n in let rec v1 = identity 10; v2 = identity True in v1"
        )

        assertType(
            "Bool",
            "let identity = \\n -> n in let rec v1 = identity 10; v2 = identity True in v2"
        )

        assertType(
            "Bool",
            "let rec identity = \\n -> n in let rec v1 = identity 10; v2 = identity True in v2"
        )
    }

    @Test
    fun `sequential declarations with partial application`() {
        assertType(
            "Int",
            "let add a b = a + b; succ = add 1 in succ 10"
        )
    }

    @Test
    fun `factorial declaration`() {
        assertType(
            "Int -> Int",
            "let rec fact n = if (n == 0) 1 else fact (n - 1) * n in fact"
        )
    }

    @Test
    fun `mutually recursive function declarations`() {
        assertType(
            "Int -> Bool",
            "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd"
        )
    }

    @Test
    fun `mutually recursive constant value declarations`() {
        assertType(
            "Int",
            "let rec a = b + 1; b = a + 1 in a"
        )
    }

    private fun assertType(expected: String, expression: String) {
        val (constraints, type) = infer(
            emptyTypeEnv,
            parse(expression)
        )

        assertEquals(expected, type.apply(constraints.solve()).toString())
    }
}
