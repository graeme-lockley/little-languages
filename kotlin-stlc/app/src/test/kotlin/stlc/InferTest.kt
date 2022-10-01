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

        assertEquals(
            constraints, Constraints(
                mutableListOf(
                    Pair(
                        TArr(TVar("V1"), TVar("V1")),
                        TArr(typeInt, TVar("V2"))
                    )
                )
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

        assertEquals(
            constraints, Constraints(
                mutableListOf(
                    Pair(
                        TVar("V1"),
                        typeBool
                    ),
                    Pair(
                        typeInt,
                        TVar("V2")
                    )
                )
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

        assertEquals(
            constraints, Constraints(
                mutableListOf(
                    Pair(
                        TVar("V1"),
                        TArr(typeInt, TVar("V2"))
                    )
                )
            )
        )
        assertEquals(TArr(TVar("V1"), TVar("V2")), type)
    }

    @Test
    fun inferLBool() {
        val (constraints, type) = infer(emptyTypeEnv, parse("True"))

        assertEquals(constraints, Constraints())
        assertEquals(typeBool, type)
    }

    @Test
    fun inferLInt() {
        val (constraints, type) = infer(emptyTypeEnv, parse("123"))

        assertEquals(constraints, Constraints())
        assertEquals(typeInt, type)
    }

    @Test
    fun inferLet() {
        val (constraints, type) = infer(emptyTypeEnv, parse("let x = 10; y = x + 1 in y"))

        assertEquals(
            constraints, Constraints(
                mutableListOf(
                    Pair(
                        TArr(typeInt, TArr(typeInt, TVar("V1"))),
                        TArr(typeInt, TArr(typeInt, typeInt))
                    )
                )
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

            assertEquals(
                constraints, Constraints(
                    mutableListOf(
                        Pair(
                            TArr(TVar("V1"), TArr(TVar("V2"), TVar("V3"))),
                            TArr(typeInt, TArr(typeInt, resultType)),
                        )
                    )
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
}
