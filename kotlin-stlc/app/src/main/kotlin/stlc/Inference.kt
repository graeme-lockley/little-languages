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

            is LetExpression -> {
                var newTypeEnv = typeEnv

                for (decl in e.decls) {
                    val tb = infer(newTypeEnv, decl.e)
                    val subst = constraints.solve()
                    newTypeEnv = newTypeEnv.apply(subst)
                    val sc = newTypeEnv.generalise(tb.apply(subst))
                    newTypeEnv = newTypeEnv.extend(decl.n, sc)
                }

                infer(newTypeEnv, e.e)
            }

            is LetRecExpression -> {
                var newTypeEnv = typeEnv
                val declarationBindings = mutableMapOf<String, Type>()

                for (decl in e.decls) {
                    val type = pump.next()
                    declarationBindings[decl.n] = type
                    newTypeEnv += Pair(decl.n, Scheme(setOf(), type))
                }

                for (decl in e.decls) {
                    val tb = infer(newTypeEnv, decl.e)
                    constraints.add(tb, declarationBindings[decl.n]!!)
                }

                val subst = constraints.solve()
                newTypeEnv = newTypeEnv.apply(subst)

                for (decl in e.decls) {
                    val sc = newTypeEnv.generalise(declarationBindings[decl.n]!!.apply(subst))
                    newTypeEnv += Pair(decl.n, sc)
                }

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
}

val ops = mapOf<Op, Type>(
    Pair(Op.Equals, TArr(typeInt, TArr(typeInt, typeBool))),
    Pair(Op.Plus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Minus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Times, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Divide, TArr(typeInt, TArr(typeInt, typeInt))),
)

data class UnknownNameException(val name: String, val typeEnv: TypeEnv) : Exception()
