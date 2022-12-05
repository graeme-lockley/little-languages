package tlca

data class Environment(val runtimeEnv: RuntimeEnv, val typeEnv: TypeEnv)

val emptyEnvironment = Environment(emptyMap(), emptyTypeEnv)

val defaultEnvironment = Environment(
    mapOf(
        "string_length" to { s: String -> s.length },
        "string_concat" to { s1: String -> { s2: String -> s1 + s2 } },
        "string_substring" to { s: String -> { start: Int -> { end: Int -> stringSubstring(s, start, end) } } },
        "string_equal" to { s1: String -> { s2: String -> s1 == s2 } },
        "string_compare" to { s1: String -> { s2: String -> if (s1 < s2) -1 else if (s1 == s2) 0 else 1 } },
    ), emptyTypeEnv
        .extend("string_length", Scheme(setOf(), TArr(typeString, typeInt)))
        .extend("string_concat", Scheme(setOf(), TArr(typeString, TArr(typeString, typeString))))
        .extend("string_substring", Scheme(setOf(), TArr(typeString, TArr(typeInt, TArr(typeInt, typeString)))))
        .extend("string_equal", Scheme(setOf(), TArr(typeString, TArr(typeString, typeBool))))
        .extend("string_compare", Scheme(setOf(), TArr(typeString, TArr(typeString, typeInt))))
)

fun stringSubstring(str: String, start: Int, end: Int): String {
    if (start > end) return ""
    val length = str.length
    val s = if (start < 0) 0 else if (start > length) length else start
    val e = if (end < 0) 0 else if (end > length) length else end
    return str.substring(s, e)
}

typealias Value = Any

typealias RuntimeEnv = Map<String, Value?>

data class TypedValue(val value: Value?, val type: Type)

data class ExecuteResult(val values: List<TypedValue>, val env: Environment)

fun execute(ast: List<Expression>, defaultEnv: Environment = emptyEnvironment): ExecuteResult {
    val pump = Pump()
    val values = mutableListOf<TypedValue>()
    var env = defaultEnv

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

private val binaryOps: Map<Op, (Any?, Any?) -> Any> = mapOf(
    Pair(Op.Plus) { a: Any?, b: Any? -> (a as Int) + (b as Int) },
    Pair(Op.Minus) { a: Any?, b: Any? -> (a as Int) - (b as Int) },
    Pair(Op.Times) { a: Any?, b: Any? -> (a as Int) * (b as Int) },
    Pair(Op.Divide) { a: Any?, b: Any? -> (a as Int) / (b as Int) },
    Pair(Op.Equals) { a: Any?, b: Any? -> a == b }
)

private data class EvaluateResult(val value: Any?, val env: RuntimeEnv)

@Suppress("UNCHECKED_CAST")
private fun evaluate(ast: Expression, env: RuntimeEnv): EvaluateResult =
    when (ast) {
        is AppExpression -> {
            val function = evaluate(ast.e1, env).value as (Any?) -> Any

            EvaluateResult(function(evaluate(ast.e2, env).value), env)
        }

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

        is LetExpression -> evaluateDeclarations(ast.decls, ast.expr, env)
        is LetRecExpression -> evaluateDeclarations(ast.decls, ast.expr, env)
        is LBoolExpression -> EvaluateResult(ast.v, env)
        is LIntExpression -> EvaluateResult(ast.v, env)
        is LStringExpression -> EvaluateResult(ast.v, env)
        LUnitExpression -> EvaluateResult(null, env)
        is OpExpression -> EvaluateResult(binaryOps[ast.op]!!(evaluate(ast.e1, env).value, evaluate(ast.e2, env).value), env)
        is VarExpression -> EvaluateResult(env[ast.name], env)
        is LTupleExpression -> EvaluateResult(ast.es.map { evaluate(it, env).value }, env)
    }

private fun evaluateDeclarations(decls: List<Declaration>, expr: Expression?, env: RuntimeEnv): EvaluateResult {
    val newEnv = env.toMutableMap()
    val values = mutableListOf<Value?>()

    for (decl in decls) {
        val value = evaluate(decl.e, newEnv).value

        values.add(value)
        newEnv[decl.n] = value
    }

    return when (expr) {
        null -> EvaluateResult(values, newEnv)
        else -> EvaluateResult(evaluate(expr, newEnv).value, env)
    }
}

fun valueToString(value: Value?, type: Type): String =
    when (type) {
        typeUnit -> "()"
        typeString -> "\"${(value as String).replace("\"", "\\\"")}\""
        is TTuple -> {
            val values = value as List<Value?>
            val types = type.types

            values.zip(types).joinToString(", ", "(", ")") { (v, t) -> valueToString(v, t) }
        }
        is TArr -> "function"
        else -> value.toString()
    }

fun expressionToNestedString(value: Value?, type: Type, e: Expression): NestedString {
    @Suppress("UNCHECKED_CAST")
    fun declarationsToNestedString(decls: List<Declaration>, type: TTuple): NestedString =
        NestedString.Sequence(decls.mapIndexed { i, d ->
            NestedString.Item(
                "${d.n} = ${
                    valueToString(
                        (value as List<Value?>)[i],
                        type.types[i]
                    )
                }: ${type.types[i]}"
            )
        })

    return when {
        e is LetExpression && type is TTuple -> declarationsToNestedString(e.decls, type)
        e is LetRecExpression && type is TTuple -> declarationsToNestedString(e.decls, type)
        else -> NestedString.Item("${valueToString(value, type)}: $type")
    }
}

open class NestedString private constructor() {
    class Sequence(private val s: List<NestedString>) : NestedString() {
        override fun toString(): String = s.joinToString("\n")
    }

    class Item(private val v: String) : NestedString() {
        override fun toString(): String = v
    }
}
