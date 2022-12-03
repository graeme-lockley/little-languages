package tlca.parser

interface Visitor<T_Program, T_Expression, T_Relational, T_Multiplicative, T_MultiplicativeOps, T_Additive, T_AdditiveOps, T_Factor, T_Declaration> {
  fun visitProgram(a: T_Expression): T_Program
  fun visitExpression(a1: T_Relational, a2: List<T_Relational>): T_Expression
  fun visitRelational(a1: T_Multiplicative, a2: io.littlelanguages.data.Tuple2<Token, T_Multiplicative>?): T_Relational
  fun visitMultiplicative(a1: T_Additive, a2: List<io.littlelanguages.data.Tuple2<T_MultiplicativeOps, T_Additive>>): T_Multiplicative
  fun visitMultiplicativeOps1(a: Token): T_MultiplicativeOps
  fun visitMultiplicativeOps2(a: Token): T_MultiplicativeOps
  fun visitAdditive(a1: T_Factor, a2: List<io.littlelanguages.data.Tuple2<T_AdditiveOps, T_Factor>>): T_Additive
  fun visitAdditiveOps1(a: Token): T_AdditiveOps
  fun visitAdditiveOps2(a: Token): T_AdditiveOps
  fun visitFactor1(a1: Token, a2: T_Expression, a3: Token): T_Factor
  fun visitFactor2(a: Token): T_Factor
  fun visitFactor3(a: Token): T_Factor
  fun visitFactor4(a: Token): T_Factor
  fun visitFactor5(a1: Token, a2: Token, a3: List<Token>, a4: Token, a5: T_Expression): T_Factor
  fun visitFactor6(a1: Token, a2: Token?, a3: T_Declaration, a4: List<io.littlelanguages.data.Tuple2<Token, T_Declaration>>, a5: Token, a6: T_Expression): T_Factor
  fun visitFactor7(a1: Token, a2: Token, a3: T_Expression, a4: Token, a5: T_Expression, a6: Token, a7: T_Expression): T_Factor
  fun visitFactor8(a: Token): T_Factor
  fun visitDeclaration(a1: Token, a2: List<Token>, a3: Token, a4: T_Expression): T_Declaration
}

class Parser<T_Program, T_Expression, T_Relational, T_Multiplicative, T_MultiplicativeOps, T_Additive, T_AdditiveOps, T_Factor, T_Declaration>(
    private val scanner: Scanner,
    private val visitor: Visitor<T_Program, T_Expression, T_Relational, T_Multiplicative, T_MultiplicativeOps, T_Additive, T_AdditiveOps, T_Factor, T_Declaration>) {
  fun program(): T_Program {
    return visitor.visitProgram(expression())
  }
  
  fun expression(): T_Expression {
    val a1: T_Relational = relational()
    val a2= mutableListOf<T_Relational>()
    
    while (isTokens(set1)) {
      val a2t: T_Relational = relational()
      a2.add(a2t)
    }
    return visitor.visitExpression(a1, a2)
  }
  
  fun relational(): T_Relational {
    val a1: T_Multiplicative = multiplicative()
    var a2: io.littlelanguages.data.Tuple2<Token, T_Multiplicative>? = null
    
    if (isToken(TToken.TEqualEqual)) {
      val a2t1: Token = matchToken(TToken.TEqualEqual)
      val a2t2: T_Multiplicative = multiplicative()
      val a2t: io.littlelanguages.data.Tuple2<Token, T_Multiplicative> = io.littlelanguages.data.Tuple2(a2t1, a2t2)
      a2 = a2t
    }
    return visitor.visitRelational(a1, a2)
  }
  
  fun multiplicative(): T_Multiplicative {
    val a1: T_Additive = additive()
    val a2= mutableListOf<io.littlelanguages.data.Tuple2<T_MultiplicativeOps, T_Additive>>()
    
    while (isTokens(set2)) {
      val a2t1: T_MultiplicativeOps = multiplicativeOps()
      val a2t2: T_Additive = additive()
      val a2t: io.littlelanguages.data.Tuple2<T_MultiplicativeOps, T_Additive> = io.littlelanguages.data.Tuple2(a2t1, a2t2)
      a2.add(a2t)
    }
    return visitor.visitMultiplicative(a1, a2)
  }
  
  fun multiplicativeOps(): T_MultiplicativeOps {
    when {
      isToken(TToken.TStar) -> {
        return visitor.visitMultiplicativeOps1(matchToken(TToken.TStar))
      }
      isToken(TToken.TSlash) -> {
        return visitor.visitMultiplicativeOps2(matchToken(TToken.TSlash))
      }
      else -> {
        throw ParsingException(peek(), set2)
      }
    }
  }
  
  fun additive(): T_Additive {
    val a1: T_Factor = factor()
    val a2= mutableListOf<io.littlelanguages.data.Tuple2<T_AdditiveOps, T_Factor>>()
    
    while (isTokens(set3)) {
      val a2t1: T_AdditiveOps = additiveOps()
      val a2t2: T_Factor = factor()
      val a2t: io.littlelanguages.data.Tuple2<T_AdditiveOps, T_Factor> = io.littlelanguages.data.Tuple2(a2t1, a2t2)
      a2.add(a2t)
    }
    return visitor.visitAdditive(a1, a2)
  }
  
  fun additiveOps(): T_AdditiveOps {
    when {
      isToken(TToken.TPlus) -> {
        return visitor.visitAdditiveOps1(matchToken(TToken.TPlus))
      }
      isToken(TToken.TDash) -> {
        return visitor.visitAdditiveOps2(matchToken(TToken.TDash))
      }
      else -> {
        throw ParsingException(peek(), set3)
      }
    }
  }
  
  fun factor(): T_Factor {
    when {
      isToken(TToken.TLParen) -> {
        val a1: Token = matchToken(TToken.TLParen)
        val a2: T_Expression = expression()
        val a3: Token = matchToken(TToken.TRParen)
        return visitor.visitFactor1(a1, a2, a3)
      }
      isToken(TToken.TLiteralInt) -> {
        return visitor.visitFactor2(matchToken(TToken.TLiteralInt))
      }
      isToken(TToken.TTrue) -> {
        return visitor.visitFactor3(matchToken(TToken.TTrue))
      }
      isToken(TToken.TFalse) -> {
        return visitor.visitFactor4(matchToken(TToken.TFalse))
      }
      isToken(TToken.TBackslash) -> {
        val a1: Token = matchToken(TToken.TBackslash)
        val a2: Token = matchToken(TToken.TIdentifier)
        val a3= mutableListOf<Token>()
        
        while (isToken(TToken.TIdentifier)) {
          val a3t: Token = matchToken(TToken.TIdentifier)
          a3.add(a3t)
        }
        val a4: Token = matchToken(TToken.TDashGreaterThan)
        val a5: T_Expression = expression()
        return visitor.visitFactor5(a1, a2, a3, a4, a5)
      }
      isToken(TToken.TLet) -> {
        val a1: Token = matchToken(TToken.TLet)
        var a2: Token? = null
        
        if (isToken(TToken.TRec)) {
          val a2t: Token = matchToken(TToken.TRec)
          a2 = a2t
        }
        val a3: T_Declaration = declaration()
        val a4= mutableListOf<io.littlelanguages.data.Tuple2<Token, T_Declaration>>()
        
        while (isToken(TToken.TSemicolon)) {
          val a4t1: Token = matchToken(TToken.TSemicolon)
          val a4t2: T_Declaration = declaration()
          val a4t: io.littlelanguages.data.Tuple2<Token, T_Declaration> = io.littlelanguages.data.Tuple2(a4t1, a4t2)
          a4.add(a4t)
        }
        val a5: Token = matchToken(TToken.TIn)
        val a6: T_Expression = expression()
        return visitor.visitFactor6(a1, a2, a3, a4, a5, a6)
      }
      isToken(TToken.TIf) -> {
        val a1: Token = matchToken(TToken.TIf)
        val a2: Token = matchToken(TToken.TLParen)
        val a3: T_Expression = expression()
        val a4: Token = matchToken(TToken.TRParen)
        val a5: T_Expression = expression()
        val a6: Token = matchToken(TToken.TElse)
        val a7: T_Expression = expression()
        return visitor.visitFactor7(a1, a2, a3, a4, a5, a6, a7)
      }
      isToken(TToken.TIdentifier) -> {
        return visitor.visitFactor8(matchToken(TToken.TIdentifier))
      }
      else -> {
        throw ParsingException(peek(), set1)
      }
    }
  }
  
  fun declaration(): T_Declaration {
    val a1: Token = matchToken(TToken.TIdentifier)
    val a2= mutableListOf<Token>()
    
    while (isToken(TToken.TIdentifier)) {
      val a2t: Token = matchToken(TToken.TIdentifier)
      a2.add(a2t)
    }
    val a3: Token = matchToken(TToken.TEqual)
    val a4: T_Expression = expression()
    return visitor.visitDeclaration(a1, a2, a3, a4)
  }
  
  
  private fun matchToken(tToken: TToken): Token =
    when (peek().tToken) {
      tToken -> nextToken()
      else -> throw ParsingException(peek(), setOf(tToken))
    }
  
  private fun nextToken(): Token {
    val result =
      peek()
    
    skipToken()
    
    return result
  }
  
  private fun skipToken() {
    scanner.next()
  }
  
  private fun isToken(tToken: TToken): Boolean =
    peek().tToken == tToken
  
  private fun isTokens(tTokens: Set<TToken>): Boolean =
    tTokens.contains(peek().tToken)
  
  private fun peek(): Token =
    scanner.current()
}

private val set1 = setOf(TToken.TLParen, TToken.TLiteralInt, TToken.TTrue, TToken.TFalse, TToken.TBackslash, TToken.TLet, TToken.TIf, TToken.TIdentifier)

private val set2 = setOf(TToken.TStar, TToken.TSlash)

private val set3 = setOf(TToken.TPlus, TToken.TDash)

class ParsingException(
  val found: Token,
  val expected: Set<TToken>) : Exception()