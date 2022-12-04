package tlca

data class Environment(val runtimeEnv: RuntimeEnv, val typeEnv: TypeEnv)

typealias Value = Any

typealias RuntimeEnv = Map<String, Value>

data class TypedValue(val value: Value, val type: Type)

data class ExecuteResult(val values: List<TypedValue>, val env: Environment)

fun execute(ast: List<Expression>): ExecuteResult {
    val pump = Pump()
    var env = Environment(emptyMap(), emptyTypeEnv)
    val values = mutableListOf<TypedValue>()

    for (e in ast) {
        val inferResult = infer(env.typeEnv, e, Constraints(), pump)

        val subst = inferResult.constraints.solve()
        val type = inferResult.type.apply(subst)

        val evaluateResult = evaluate(e, env.runtimeEnv)

        values.add(TypedValue(evaluateResult.value, type))

        env = Environment(evaluateResult.env, inferResult.typeEnv)
    }

    return ExecuteResult(values, env)
}

private val binaryOps: Map<Op, (Any, Any) -> Any> = mapOf(
    Pair(Op.Plus) { a: Any, b: Any -> (a as Int) + (b as Int) },
    Pair(Op.Minus) { a: Any, b: Any -> (a as Int) - (b as Int) },
    Pair(Op.Times) { a: Any, b: Any -> (a as Int) * (b as Int) },
    Pair(Op.Divide) { a: Any, b: Any -> (a as Int) / (b as Int) },
    Pair(Op.Equals) { a: Any, b: Any -> a == b }
)

private data class EvaluateResult(val value: Any, val env: RuntimeEnv)

@Suppress("UNCHECKED_CAST")
private fun evaluate(ast: Expression, env: Map<String, Any>): EvaluateResult =
    when (ast) {
        is AppExpression -> {
            val function = evaluate(ast.e1, env).value as (Any) -> Any

            EvaluateResult(function(evaluate(ast.e2, env).value), env)
        }

        is BlockExpression -> TODO()

        is IfExpression ->
            EvaluateResult(
                if (evaluate(ast.e1, env).value as Boolean)
                    evaluate(ast.e2, env).value
                else
                    evaluate(ast.e3, env).value,
                env
            )

        is LamExpression ->
            EvaluateResult({ x: Any -> evaluate(ast.e, env + Pair(ast.n, x)).value }, env)

        is LetExpression -> evaluateDeclarations(ast.decls, env)
        is LetRecExpression -> evaluateDeclarations(ast.decls, env)
        is LIntExpression -> EvaluateResult(ast.v, env)
        is LBoolExpression -> EvaluateResult(ast.v, env)
        is OpExpression -> EvaluateResult(binaryOps[ast.op]!!(evaluate(ast.e1, env).value, evaluate(ast.e2, env).value), env)
        is VarExpression -> EvaluateResult(env[ast.name]!!, env)
        is LTupleExpression -> EvaluateResult(ast.es.map { evaluate(it, env).value }, env)
    }

private fun evaluateDeclarations(decls: List<Declaration>, env: RuntimeEnv): EvaluateResult {
    val newEnv = env.toMutableMap()
    val values = mutableListOf<Value>()

    for (decl in decls) {
        val value = evaluate(decl.e, newEnv).value

        values.add(value)
        newEnv[decl.n] = value
    }

    return EvaluateResult(values, newEnv)
}

fun valueToString(value: Value, type: Type): String =
    when (type) {
        typeUnit -> "null"
        is TArr -> "function"
        else -> value.toString()
    }

fun expressionToNestedString(value: Value, type: Type, e: Expression): NestedString =
    if (e is LetExpression && type is TTuple)
        NestedString.Sequence(e.decls.mapIndexed { i, d ->
            NestedString.Item(
                "${d.n} = ${
                    valueToString(
                        (value as List<Value>)[i],
                        type.types[i]
                    )
                }: ${type.types[i]}"
            )
        })
    else if (e is LetRecExpression && type is TTuple)
        NestedString.Sequence(e.decls.mapIndexed { i, d ->
            NestedString.Item(
                "${d.n} = ${
                    valueToString(
                        (value as List<Value>)[i],
                        type.types[i]
                    )
                }: ${type.types[i]}"
            )
        })
    else
        NestedString.Item("${valueToString(value, type)}: $type")

open class NestedString private constructor() {
    class Sequence(private val s: List<NestedString>) : NestedString() {
        override fun toString(): String = s.joinToString("\n")
    }

    class Item(private val v: String) : NestedString() {
        override fun toString(): String = v
    }
}
