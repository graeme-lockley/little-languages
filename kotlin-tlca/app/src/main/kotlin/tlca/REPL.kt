package tlca

fun main() {
    var env = emptyEnvironment
    while (true) {
        val input = readline().trim()

        if (input == ".quit") {
            println("bye")
            break
        }

        val ast = parse(input)
        val (values, newEnv) = execute(ast, env)
        env = newEnv

        ast.forEachIndexed { index, expression ->
            val (value, type) = values[index]

            println(expressionToNestedString(value, type, expression).toString())
        }
    }
}

fun readline(): String {
    var result = ""

    while (true) {
        if (result.isEmpty())
            print("> ")
        else
            print(". ")

        val s = readln()
        result = result + "\n" + s.trimEnd()

        if (result.endsWith(";;"))
            return result.dropLast(2)
    }
}