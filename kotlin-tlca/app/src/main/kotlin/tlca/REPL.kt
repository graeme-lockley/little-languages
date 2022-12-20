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

            try {
                env = executeInput(input, env)
            } catch (e: RuntimeException) {
                println(e.message)
            }
        }
    } else if (args.size == 1) {
        val input = File(args[0]).readText()
        executeInput(input, defaultEnvironment)
    } else {
        println("Usage: tlca [file-name]")
    }
}

private fun renameTypeVariables(t: Type): Type {
    var i = 0

    fun nextVar(): String =
        if (i < 26)
            ('a' + i++).toString()
        else
            "t${i++ - 26}"

    val vars = t.ftv().toList()
    val subst = Subst(vars.zip(vars.map { TVar(nextVar()) }).toMap())
    return t.apply(subst)
}

private fun executeInput(input: String, env: Environment): Environment {
    val ast = parse(input)
    val executeResult = execute(ast, env)

    ast.forEachIndexed { index, element ->
        val (value, type) = executeResult.values[index]

        if (type == null)
            println((value as List<*>).joinToString(", "))
        else
            println(elementToNestedString(value, renameTypeVariables(type), element).toString())
    }

    return executeResult.env
}

private fun readline(): String {
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