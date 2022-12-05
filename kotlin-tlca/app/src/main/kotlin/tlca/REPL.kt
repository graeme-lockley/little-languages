package tlca

import java.io.File

fun main(args: Array<String>) {
    if (args.isEmpty()) {
        var env = defaultEnvironment
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
    } else if (args.size == 1) {
        val input = File(args[0]).readText()
        val ast = parse(input)
        val (values, _) = execute(ast, defaultEnvironment)

        ast.forEachIndexed { index, expression ->
            val (value, type) = values[index]

            println(expressionToNestedString(value, type, expression).toString())
        }
    } else {
        println("Usage: tlca [file-name]")
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