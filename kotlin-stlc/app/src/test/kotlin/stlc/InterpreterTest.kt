package stlc

import kotlin.test.Test
import kotlin.test.assertEquals

class InterpreterTest {
    @Test
    fun executeApp() {
        assertExecute("(\\a -> \\b -> a + b) 10 20", "30: Int")
    }

    @Test
    fun executeIf() {
        assertExecute("if (True) 1 else 2", "1: Int")
        assertExecute("if (False) 1 else 2", "2: Int")
    }

    @Test
    fun executeLam() {
        assertExecute("\\a -> \\b -> a + b", "function: Int -> Int -> Int")
    }

    @Test
    fun executeLet() {
        assertExecute("let add a b = a + b ; incr = add 1 in incr 10", "11: Int")
    }

    @Test
    fun executeLetRec() {
        assertExecute(
            "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact",
            "function: Int -> Int",
        )
        assertExecute(
            "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact 5",
            "120: Int",
        )

        assertExecute(
            "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isEven 5",
            "false: Bool",
        )
        assertExecute(
            "let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd 5",
            "true: Bool",
        )
    }

    @Test
    fun executeLBool() {
        assertExecute("True", "true: Bool")
        assertExecute("False", "false: Bool")
    }

    @Test
    fun executeLInt() {
        assertExecute("123", "123: Int")
    }

    @Test
    fun executeOp() {
        assertExecute("1 == 2", "false: Bool")
        assertExecute("2 == 2", "true: Bool")

        assertExecute("3 + 2", "5: Int")
        assertExecute("3 - 2", "1: Int")
        assertExecute("3 * 2", "6: Int")
        assertExecute("9 / 2", "4: Int")
    }

    @Test
    fun executeVar() {
        assertExecute("let x = 1 in x", "1: Int")
        assertExecute("let x = True in x", "true: Bool")
        assertExecute("let x = \\a -> a in x", "function: V2 -> V2")
    }

    @Test
    fun executeArb() {
        assertExecute("let x n = let ss b = if (b == n) 1 else 2 in ss 5 in x", "function: Int -> Int")
    }
}

private fun assertExecute(input: String, expected: String) {
    val (value, type) = execute(input)

    if (type is TArr) {
        assertEquals(expected, "function: $type")
    } else {
        assertEquals(expected, "$value: $type")
    }
}