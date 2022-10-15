package stlc

import io.littlelanguages.data.Tuple2
import stlc.parser.Parser
import stlc.parser.Scanner
import stlc.parser.Token
import stlc.parser.Visitor
import java.io.StringReader

sealed class Expression

data class AppExpression(val e1: Expression, val e2: Expression) : Expression()

data class IfExpression(val e1: Expression, val e2: Expression, val e3: Expression) : Expression()

data class LetExpression(val decls: List<Declaration>, val e: Expression) : Expression()

data class LetRecExpression(val decls: List<Declaration>, val e: Expression) : Expression()

data class Declaration(val n: String, val e: Expression)

data class LamExpression(val n: String, val e: Expression) : Expression()

data class LBoolExpression(val v: Boolean) : Expression()

data class LIntExpression(val v: Int) : Expression()

data class LTupleExpression(val es: List<Expression>) : Expression()

data class OpExpression(val e1: Expression, val e2: Expression, val op: Op) : Expression()

enum class Op { Equals, Plus, Minus, Times, Divide }

data class VarExpression(val name: String) : Expression()

class ParserVisitor : Visitor<Expression, Expression, Expression, Expression, Op, Expression, Op, Expression, Declaration> {
    override fun visitProgram(a: Expression): Expression = a

    override fun visitExpression(a1: Expression, a2: List<Expression>): Expression = a2.fold(a1) { acc, e -> AppExpression(acc, e) }

    override fun visitRelational(a1: Expression, a2: Tuple2<Token, Expression>?): Expression =
        if (a2 == null) a1 else OpExpression(a1, a2.b, Op.Equals)

    override fun visitMultiplicative(a1: Expression, a2: List<Tuple2<Op, Expression>>): Expression =
        a2.fold(a1) { acc, e -> OpExpression(acc, e.b, e.a) }

    override fun visitMultiplicativeOps1(a: Token): Op = Op.Times

    override fun visitMultiplicativeOps2(a: Token): Op = Op.Divide

    override fun visitAdditive(a1: Expression, a2: List<Tuple2<Op, Expression>>): Expression = a2.fold(a1) { acc, e -> OpExpression(acc, e.b, e.a) }

    override fun visitAdditiveOps1(a: Token): Op = Op.Plus

    override fun visitAdditiveOps2(a: Token): Op = Op.Minus

    override fun visitFactor1(a1: Token, a2: Expression, a3: Token): Expression = a2

    override fun visitFactor2(a: Token): Expression = LIntExpression(a.lexeme.toInt())

    override fun visitFactor3(a: Token): Expression = LBoolExpression(true)

    override fun visitFactor4(a: Token): Expression = LBoolExpression(false)

    override fun visitFactor5(a1: Token, a2: Token, a3: List<Token>, a4: Token, a5: Expression): Expression =
        composeLambda(listOf(a2.lexeme) + a3.map { it.lexeme }, a5)

    override fun visitFactor6(
        a1: Token, a2: Token?, a3: Declaration, a4: List<Tuple2<Token, Declaration>>, a5: Token, a6: Expression
    ): Expression {
        val declarations = listOf(a3) + a4.map { it.b }

        return if (a2 == null) LetExpression(declarations, a6)
        else LetRecExpression(declarations, a6)
    }

    override fun visitFactor7(a1: Token, a2: Token, a3: Expression, a4: Token, a5: Expression, a6: Token, a7: Expression): Expression =
        IfExpression(a3, a5, a7)


    override fun visitFactor8(a: Token): Expression = VarExpression(a.lexeme)

    override fun visitDeclaration(a1: Token, a2: List<Token>, a3: Token, a4: Expression): Declaration =
        Declaration(a1.lexeme, composeLambda(a2.map { it.lexeme }, a4))

    private fun composeLambda(names: List<String>, e: Expression): Expression = names.foldRight(e) { name, acc -> LamExpression(name, acc) }
}

fun parse(scanner: Scanner): Expression =
    Parser(scanner, ParserVisitor()).program()

fun parse(input: String): Expression =
    parse(Scanner(StringReader(input)))

