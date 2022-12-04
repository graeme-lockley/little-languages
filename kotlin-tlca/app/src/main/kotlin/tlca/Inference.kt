package tlca

data class InferExpressionsResult(val constraints: Constraints, val types: List<Type>, val typeEnv: TypeEnv)

fun infer(typeEnv: TypeEnv, es: List<Expression>, constraints: Constraints, pump: Pump): InferExpressionsResult {
    val types = mutableListOf<Type>()
    var resultTypeEnv = typeEnv

    for(e in es) {
        val inferResult = infer(resultTypeEnv, e, constraints, pump)
        types.add(inferResult.type)
        resultTypeEnv = inferResult.typeEnv
    }

    return InferExpressionsResult(constraints, types, resultTypeEnv)
}

data class InferExpressionResult(val constraints: Constraints, val type: Type, val typeEnv: TypeEnv)

fun infer(typeEnv: TypeEnv, e: Expression, constraints: Constraints, pump: Pump): InferExpressionResult {
    val state = Inference(constraints, pump)

    val inferenceResult = state.infer(typeEnv, e)

    return InferExpressionResult(state.constraints, inferenceResult.type, inferenceResult.typeEnv)
}

private data class InferenceResult(val type: Type, val typeEnv: TypeEnv)

private class Inference(val constraints: Constraints = Constraints(), val pump: Pump = Pump()) {
    fun infer(typeEnv: TypeEnv, e: Expression): InferenceResult =
        when (e) {
            is AppExpression -> {
                val t1 = infer(typeEnv, e.e1).type
                val t2 = infer(typeEnv, e.e2).type
                val tv = pump.next()

                constraints.add(t1, TArr(t2, tv))

                InferenceResult(tv, typeEnv)
            }

            is IfExpression -> {
                val t1 = infer(typeEnv, e.e1).type
                val t2 = infer(typeEnv, e.e2).type
                val t3 = infer(typeEnv, e.e3).type

                constraints.add(t1, typeBool)
                constraints.add(t2, t3)

                InferenceResult(t2, typeEnv)
            }

            is LamExpression -> {
                val tv = pump.next()
                val t = infer(typeEnv + Pair(e.n, Scheme(setOf(), tv)), e.e).type

                InferenceResult(TArr(tv, t), typeEnv)
            }

            is LBoolExpression ->
                InferenceResult(typeBool, typeEnv)

            is LIntExpression ->
                InferenceResult(typeInt, typeEnv)

            is LTupleExpression ->
                InferenceResult(TTuple(e.es.map { infer(typeEnv, it).type }), typeEnv)

            is LetExpression -> {
                var newTypeEnv = typeEnv
                val types = mutableListOf<Type>()

                for (decl in e.decls) {
                    val interimConstraints = constraints.clone()
                    val inferredType = inferExpression(newTypeEnv, decl.e, interimConstraints)
                    val subst = interimConstraints.solve()
                    newTypeEnv = newTypeEnv.apply(subst)
                    val type = inferredType.apply(subst)
                    types.add(type)
                    val sc = newTypeEnv.generalise(type)
                    newTypeEnv = newTypeEnv.extend(decl.n, sc)
                }

                InferenceResult(TTuple(types), newTypeEnv)
            }

            is LetRecExpression -> {
                val interimConstraints = constraints.clone()

                val tvs = pump.nextN(e.decls.size)

                val interimTypeEnv = typeEnv + e.decls.zip(tvs).map { (decl, tv) -> Pair(decl.n, Scheme(setOf(), tv)) }
                val declarationType = fix(interimTypeEnv, LamExpression("_bob", LTupleExpression(e.decls.map { it.e })), interimConstraints)
                interimConstraints.add(declarationType, TTuple(tvs))

                val subst = interimConstraints.solve()
                val solvedTypeEnv = typeEnv.apply(subst)
                val solvedTypes = tvs.map { it.apply(subst) }
                val newTypeEnv = solvedTypeEnv +
                        e.decls.zip(solvedTypes).map { (decl, tv) -> Pair(decl.n, solvedTypeEnv.generalise(tv)) }

                InferenceResult(TTuple(solvedTypes), newTypeEnv)
            }

            is OpExpression -> {
                val t1 = infer(typeEnv, e.e1).type
                val t2 = infer(typeEnv, e.e2).type
                val tv = pump.next()

                val u1 = TArr(t1, TArr(t2, tv))
                val u2 = ops[e.op] ?: typeError
                constraints.add(u1, u2)

                InferenceResult(tv, typeEnv)
            }

            is VarExpression -> {
                val scheme = typeEnv[e.name] ?: throw UnknownNameException(e.name, typeEnv)

                InferenceResult(scheme.instantiate(pump), typeEnv)
            }
        }

    private fun fix(typeEnv: TypeEnv, e: Expression, constraints: Constraints): Type {
        val t1 = inferExpression(typeEnv, e, constraints)
        val tv = pump.next()

        constraints.add(TArr(tv, tv), t1)

        return tv
    }

    private fun inferExpression(typeEnv: TypeEnv, e: Expression, constraints: Constraints): Type =
        Inference(constraints, pump).infer(typeEnv, e).type
}

val ops = mapOf<Op, Type>(
    Pair(Op.Equals, TArr(typeInt, TArr(typeInt, typeBool))),
    Pair(Op.Plus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Minus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Times, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Divide, TArr(typeInt, TArr(typeInt, typeInt))),
)

data class UnknownNameException(val name: String, val typeEnv: TypeEnv) : Exception()
