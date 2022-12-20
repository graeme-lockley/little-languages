package stlc

data class InferResult(val constraints: Constraints, val type: Type)

fun infer(typeEnv: TypeEnv, e: Expression): InferResult {
    val state = Inference()

    val type = state.infer(typeEnv, e)

    return InferResult(state.constraints, type)
}

private class Inference(val constraints: Constraints = Constraints(), val pump: Pump = Pump()) {
    fun infer(typeEnv: TypeEnv, e: Expression): Type =
        when (e) {
            is AppExpression -> {
                val t1 = infer(typeEnv, e.e1)
                val t2 = infer(typeEnv, e.e2)
                val tv = pump.next()

                constraints.add(t1, TArr(t2, tv))

                tv
            }

            is IfExpression -> {
                val t1 = infer(typeEnv, e.e1)
                val t2 = infer(typeEnv, e.e2)
                val t3 = infer(typeEnv, e.e3)

                constraints.add(t1, typeBool)
                constraints.add(t2, t3)

                t2
            }

            is LamExpression -> {
                val tv = pump.next()
                val t = infer(typeEnv + Pair(e.n, Scheme(setOf(), tv)), e.e)

                TArr(tv, t)
            }

            is LBoolExpression ->
                typeBool

            is LIntExpression ->
                typeInt

            is LTupleExpression ->
                TTuple(e.es.map { infer(typeEnv, it) })

            is LetExpression -> {
                var newTypeEnv = typeEnv

                for (decl in e.decls) {
                    val interimConstraints = constraints
                    val inferredType = inferExpression(newTypeEnv, decl.e, interimConstraints)
                    val subst = interimConstraints.solve()
                    newTypeEnv = newTypeEnv.apply(subst)
                    val sc = newTypeEnv.generalise(inferredType.apply(subst))
                    newTypeEnv = newTypeEnv.extend(decl.n, sc)
                }

                infer(newTypeEnv, e.e)
            }

            is LetRecExpression -> {
                val tvs = pump.nextN(e.decls.size)

                val interimTypeEnv = typeEnv + e.decls.zip(tvs).map { (decl, tv) -> Pair(decl.n, Scheme(setOf(), tv)) }
                val declarationType = fix(interimTypeEnv, LamExpression("_bob", LTupleExpression(e.decls.map { it.e })), constraints)
                constraints.add(declarationType, TTuple(tvs))

                val subst = constraints.solve()
                val solvedTypeEnv = typeEnv.apply(subst)
                val newTypeEnv = solvedTypeEnv +
                        e.decls.zip(tvs).map { (decl, tv) -> Pair(decl.n, solvedTypeEnv.generalise(tv.apply(subst))) }

                infer(newTypeEnv, e.e)
            }

            is OpExpression -> {
                val t1 = infer(typeEnv, e.e1)
                val t2 = infer(typeEnv, e.e2)
                val tv = pump.next()

                val u1 = TArr(t1, TArr(t2, tv))
                val u2 = ops[e.op] ?: typeError
                constraints.add(u1, u2)

                tv
            }

            is VarExpression -> {
                val scheme = typeEnv[e.name] ?: throw UnknownNameException(e.name, typeEnv)

                scheme.instantiate(pump)
            }
        }

    private fun fix(typeEnv: TypeEnv, e: Expression, constraints: Constraints): Type {
        val t1 = inferExpression(typeEnv, e, constraints)
        val tv = pump.next()

        constraints.add(TArr(tv, tv), t1)

        return tv
    }

    private fun inferExpression(typeEnv: TypeEnv, e: Expression, constraints: Constraints): Type =
        Inference(constraints, pump).infer(typeEnv, e)
}

val ops = mapOf<Op, Type>(
    Pair(Op.Equals, TArr(typeInt, TArr(typeInt, typeBool))),
    Pair(Op.Plus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Minus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Times, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Divide, TArr(typeInt, TArr(typeInt, typeInt))),
)

data class UnknownNameException(val name: String, val typeEnv: TypeEnv) : Exception()
