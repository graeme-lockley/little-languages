package stlc

import kotlin.test.Test
import kotlin.test.assertEquals

class InferTest {
    @Test
    fun inferApply() {
        val (constraints, type) = infer(
            emptyTypeEnv
                    + Pair("a", Scheme(setOf("T"), TArr(TVar("T"), TVar("T"))))
                    + Pair("b", Scheme(emptySet(), typeInt)),
            parse("a b")
        )

        assertConstraints(
            constraints, listOf(
                "V1 -> V1 ~ Int -> V2"
            )
        )
        assertEquals(TVar("V2"), type)
    }

    @Test
    fun inferIf() {
        val (constraints, type) = infer(
            emptyTypeEnv
                    + Pair("a", Scheme(setOf("S"), TVar("S")))
                    + Pair("b", Scheme(emptySet(), typeInt))
                    + Pair("c", Scheme(setOf("S"), TVar("S"))),
            parse("if (a) b else c")
        )

        assertConstraints(
            constraints, listOf(
                "V1 ~ Bool",
                "Int ~ V2"
            )
        )
        assertEquals(typeInt, type)
    }

    @Test
    fun inferLam() {
        val (constraints, type) = infer(
            emptyTypeEnv,
            parse("\\x -> x 10")
        )

        assertConstraints(
            constraints, listOf(
                "V1 ~ Int -> V2"
            )
        )
        assertEquals("V1 -> V2", type.toString())
    }

    @Test
    fun inferLBool() {
        val (constraints, type) = infer(emptyTypeEnv, parse("True"))

        assertConstraints(constraints, emptyList())
        assertEquals(typeBool, type)
    }

    @Test
    fun inferLInt() {
        val (constraints, type) = infer(emptyTypeEnv, parse("123"))

        assertConstraints(constraints, emptyList())
        assertEquals(typeInt, type)
    }

    @Test
    fun inferLet() {
        val (constraints, type) = infer(emptyTypeEnv, parse("let x = 10; y = x + 1 in y"))

        assertConstraints(
            constraints, listOf(
                "Int -> Int -> V1 ~ Int -> Int -> Int"
            )
        )
        assertEquals(typeInt, type)
    }

    @Test
    fun inferOp() {
        fun scenario(input: String, resultType: Type) {
            val (constraints, type) = infer(
                emptyTypeEnv
                        + Pair("a", Scheme(setOf("T"), TVar("T")))
                        + Pair("b", Scheme(setOf("T"), TVar("T"))),
                parse(input)
            )

            assertConstraints(
                constraints, listOf(
                    "V1 -> V2 -> V3 ~ Int -> Int -> $resultType"
                )
            )

            assertEquals(TVar("V3"), type)
        }

        scenario("a + b", typeInt)
        scenario("a - b", typeInt)
        scenario("a * b", typeInt)
        scenario("a / b", typeInt)
        scenario("a == b", typeBool)
    }

    @Test
    fun inferVar() {
        val (constraints, type) = infer(
            emptyTypeEnv
                    + Pair("a", Scheme(setOf("T"), TArr(TVar("T"), TVar("T")))), parse("a")
        )

        assertEquals(constraints, Constraints())
        assertEquals(TArr(TVar("V1"), TVar("V1")), type)
    }

    private fun assertConstraints(constraints: Constraints, expected: List<String>) {
        assertEquals(constraints.toString(), expected.joinToString(", "))
    }
}
