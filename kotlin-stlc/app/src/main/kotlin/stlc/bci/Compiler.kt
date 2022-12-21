package stlc.bci

import stlc.*
import java.io.File

fun compileTo(input: String, fileName: File) {
    val e = parse(input)
    val (constraints, type) = infer(emptyTypeEnv, e)
    type.apply(constraints.solve())

    val builder = Builder()

    compile(e, builder)

    builder.writeTo(fileName)
}

fun compileTo(input: String, fileName: String) {
    compileTo(input, File(fileName))
}

data class Binding(val depth: Int, val offset: Int)

data class Environment(val variables: Map<String, Binding>, val depth: Int = 0, val nextOffset: Int = 0) {
    fun openScope(): Environment =
        Environment(variables, depth + 1, 0)

    fun bind(name: String): Environment =
        Environment(variables + Pair(name, Binding(depth, nextOffset)), depth, nextOffset + 1)
}

private fun compile(toplevel: Expression, builder: Builder) {
    var labelNameGenerator = 0

    fun nextLabelName() = "L${labelNameGenerator++}"

    fun enterSize(e:Expression): Int =
        when (e) {
            is AppExpression -> enterSize(e.e1) + enterSize(e.e2)
            is IfExpression -> enterSize(e.e1) + enterSize(e.e2) + enterSize(e.e3)
            is LamExpression -> 0
            is LetExpression -> e.decls.size + enterSize(e.e)
            is LetRecExpression -> e.decls.size + enterSize(e.e)
            is VarExpression -> 0
            is LIntExpression -> 0
            is LBoolExpression -> 0
            is LTupleExpression -> 0
            is OpExpression -> enterSize(e.e1) + enterSize(e.e2)
        }

    fun compileExpression(e: Expression, bb: BlockBuilder, env: Environment) {
        when (e) {
            is AppExpression -> {
                compileExpression(e.e1, bb, env)
                compileExpression(e.e2, bb, env)
                bb.writeOpCode(InstructionOpCode.SWAP_CALL)
            }

            is IfExpression -> {
                val thenLabel = nextLabelName()
                val nextLabel = nextLabelName()

                compileExpression(e.e1, bb, env)
                bb.writeOpCode(InstructionOpCode.JMP_TRUE)
                bb.writeLabel(thenLabel)

                compileExpression(e.e3, bb, env)
                bb.writeOpCode(InstructionOpCode.JMP)
                bb.writeLabel(nextLabel)

                bb.markLabel(thenLabel)
                compileExpression(e.e2, bb, env)

                bb.markLabel(nextLabel)
            }

            is LBoolExpression -> {
                val opCode = if (e.v) InstructionOpCode.PUSH_TRUE else InstructionOpCode.PUSH_FALSE
                bb.writeOpCode(opCode)
            }

            is LIntExpression -> {
                bb.writeOpCode(InstructionOpCode.PUSH_INT)
                bb.writeInt(e.v)
            }

            is LTupleExpression -> {
                for (expr in e.es) {
                    compileExpression(expr, bb, env)
                }

                bb.writeOpCode(InstructionOpCode.PUSH_TUPLE)
                bb.writeInt(e.es.size)
            }

            is LamExpression -> {
                val name = nextLabelName()

                val lambdaBlock = builder.createBlock(name)

                lambdaBlock.writeOpCode(InstructionOpCode.ENTER)
                lambdaBlock.writeInt(1 + enterSize(e.e))
                lambdaBlock.writeOpCode(InstructionOpCode.STORE_VAR)
                lambdaBlock.writeInt(0)
                compileExpression(e.e, lambdaBlock, env.openScope().bind(e.n))
                lambdaBlock.writeOpCode(InstructionOpCode.RET)

                bb.writeOpCode(InstructionOpCode.PUSH_CLOSURE)
                bb.writeLabel(name)
            }

            is LetExpression -> {
                var newEnv = env

                for (d in e.decls) {
                    compileExpression(d.e, bb, newEnv)

                    newEnv = newEnv.bind(d.n)
                    bb.writeOpCode(InstructionOpCode.STORE_VAR)
                    bb.writeInt(newEnv.variables[d.n]!!.offset)
                }

                compileExpression(e.e, bb, newEnv)
            }
            is LetRecExpression -> {
                var newEnv = env

                for (d in e.decls) {
                    newEnv = newEnv.bind(d.n)
                }

                for (d in e.decls) {
                    compileExpression(d.e, bb, newEnv)
                    bb.writeOpCode(InstructionOpCode.STORE_VAR)
                    bb.writeInt(newEnv.variables[d.n]!!.offset)
                }

                compileExpression(e.e, bb, newEnv)
            }

            is OpExpression -> {
                compileExpression(e.e1, bb, env)
                compileExpression(e.e2, bb, env)
                when (e.op) {
                    Op.Plus -> bb.writeOpCode(InstructionOpCode.ADD)
                    Op.Minus -> bb.writeOpCode(InstructionOpCode.SUB)
                    Op.Times -> bb.writeOpCode(InstructionOpCode.MUL)
                    Op.Divide -> bb.writeOpCode(InstructionOpCode.DIV)
                    Op.Equals -> bb.writeOpCode(InstructionOpCode.EQ)
                }
            }

            is VarExpression -> {
                val binding = env.variables[e.name] ?: throw Exception("Unknown variable ${e.name}")
                bb.writeOpCode(InstructionOpCode.PUSH_VAR)
                bb.writeInt(env.depth - binding.depth)
                bb.writeInt(binding.offset)
            }
        }
    }

    val bb = builder.createBlock(nextLabelName())
    val es = enterSize(toplevel)
    if (es > 0) {
        bb.writeOpCode(InstructionOpCode.ENTER)
        bb.writeInt(es)
    }

    compileExpression(toplevel, bb, Environment(emptyMap(), 0))
    bb.writeOpCode(InstructionOpCode.RET)
}
