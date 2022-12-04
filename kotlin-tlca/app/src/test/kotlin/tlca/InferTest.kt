package tlca

import kotlin.test.Test
import kotlin.test.assertEquals

class InferTest {
    @Test
    fun inferApply() {
        assertInference(
            emptyTypeEnv
                    + Pair("a", Scheme(setOf("T"), TArr(TVar("T"), TVar("T"))))
                    + Pair("b", Scheme(emptySet(), typeInt)),
            "a b",
            listOf("V1 -> V1 ~ Int -> V2"),
            listOf("V2")
        )
    }

    @Test
    fun inferIf() {
        assertInference(
            emptyTypeEnv
                    + Pair("a", Scheme(setOf("S"), TVar("S")))
                    + Pair("b", Scheme(emptySet(), typeInt))
                    + Pair("c", Scheme(setOf("S"), TVar("S"))),
            "if (a) b else c",
            listOf(
                "V1 ~ Bool",
                "Int ~ V2"
            ),
            listOf("Int")
        )
    }

    @Test
    fun inferLam() {
        assertInference(
            emptyTypeEnv,
            "\\x -> x 10",
            listOf("V1 ~ Int -> V2"),
            listOf("V1 -> V2")
        )
    }

    @Test
    fun inferLBool() {
        assertInference(emptyTypeEnv, "True", emptyList(), listOf("Bool"))
    }

    @Test
    fun inferLInt() {
        assertInference(emptyTypeEnv, "123", emptyList(), listOf("Int"))
    }

    @Test
    fun inferLet() {
        assertInference(
            emptyTypeEnv,
            "let x = 10 and y = x + 1 ; y",
            emptyList(),
            listOf("(Int * Int)", "Int")
        )
    }

    @Test
    fun inferOp() {
        fun scenario(input: String, resultType: Type) {
            assertInference(
                emptyTypeEnv
                        + Pair("a", Scheme(setOf("T"), TVar("T")))
                        + Pair("b", Scheme(setOf("T"), TVar("T"))),
                input,
                listOf(
                    "V1 -> V2 -> V3 ~ Int -> Int -> $resultType"
                ),
                listOf("V3")
            )
        }

        scenario("a + b", typeInt)
        scenario("a - b", typeInt)
        scenario("a * b", typeInt)
        scenario("a / b", typeInt)
        scenario("a == b", typeBool)
    }

    @Test
    fun inferVar() {
        assertInference(
            emptyTypeEnv + Pair("a", Scheme(setOf("T"), TArr(TVar("T"), TVar("T")))),
            "a",
            emptyList(),
            listOf("V1 -> V1")
        )
    }

    private fun assertInference(typeEnv: TypeEnv, input: String, expectedConstraints: List<String>, expectedTypes: List<String>) {
        val inferResult = infer(typeEnv, parse(input), Constraints(), Pump())

        assertConstraints(inferResult.constraints, expectedConstraints)
        assertEquals(expectedTypes, inferResult.types.map { it.toString() })
    }

    private fun assertConstraints(constraints: Constraints, expected: List<String>) {
        assertEquals(expected.joinToString(", "), constraints.toString())
    }
}
