package stlc

data class ExecuteResult(val value: Any, val type: Type)

fun execute(input: String): ExecuteResult {
    val ast = parse(input)
    val (constraints, type) = infer(
        emptyTypeEnv,
        ast
    )
    return ExecuteResult(evaluate(ast, emptyMap()), type.apply(constraints.solve()))
}

private val binaryOps: Map<Op, (Any, Any) -> Any> = mapOf(
    Pair(Op.Plus) { a: Any, b: Any -> (a as Int) + (b as Int) },
    Pair(Op.Minus) { a: Any, b: Any -> (a as Int) - (b as Int) },
    Pair(Op.Times) { a: Any, b: Any -> (a as Int) * (b as Int) },
    Pair(Op.Divide) { a: Any, b: Any -> (a as Int) / (b as Int) },
    Pair(Op.Equals) { a: Any, b: Any -> a == b }
)

@Suppress("UNCHECKED_CAST")
private fun evaluate(ast: Expression, env: Map<String, Any>): Any =
    when (ast) {
        is AppExpression -> {
            val function = evaluate(ast.e1, env) as (Any) -> Any

            function(evaluate(ast.e2, env))
        }

        is IfExpression ->
            if (evaluate(ast.e1, env) as Boolean) {
                evaluate(ast.e2, env)
            } else {
                evaluate(ast.e3, env)
            }

        is LamExpression ->
            { x: Any -> evaluate(ast.e, env + Pair(ast.n, x)) }

        is LetExpression -> {
            var newEnv = env

            for (decl in ast.decls) {
                newEnv = newEnv + Pair(decl.n, evaluate(decl.e, newEnv))
            }

            evaluate(ast.e, newEnv)
        }

        is LetRecExpression -> {
            val newEnv = env.toMutableMap()

            for (decl in ast.decls) {
                newEnv[decl.n] = evaluate(decl.e, newEnv)
            }

            evaluate(ast.e, newEnv)
        }

        is LIntExpression -> ast.v
        is LBoolExpression -> ast.v
        is OpExpression -> binaryOps[ast.op]!!(evaluate(ast.e1, env), evaluate(ast.e2, env))
        is VarExpression -> env[ast.name]!!
        is LTupleExpression -> ast.es.map { evaluate(it, env) }
    }
