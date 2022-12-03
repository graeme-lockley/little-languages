package tlca.parser

import java.io.Reader
import io.littlelanguages.scanpiler.AbstractScanner
import io.littlelanguages.scanpiler.AbstractToken
import io.littlelanguages.scanpiler.Location

class Scanner(input: Reader): AbstractScanner<TToken>(input, TToken.TERROR) {
  override fun newToken(ttoken: TToken, location: Location, lexeme: String): AbstractToken<TToken> =
    Token(ttoken, location, lexeme)
  
  override fun next() {
    if (currentToken.tToken != TToken.TEOS) {
      while (nextCh in 0..32) {
        nextChar()
      }
      
      var state = 0
      while (true) {
        when (state) {
          0 -> {
            if (nextCh == 61) {
              markAndNextChar()
              state = 1
            } else if (nextCh == 101) {
              markAndNextChar()
              state = 2
            } else if (nextCh == 105) {
              markAndNextChar()
              state = 3
            } else if (nextCh == 59) {
              markAndNextChar()
              state = 4
            } else if (nextCh == 114) {
              markAndNextChar()
              state = 5
            } else if (nextCh == 108) {
              markAndNextChar()
              state = 6
            } else if (nextCh == 45) {
              markAndNextChar()
              state = 7
            } else if (nextCh == 92) {
              markAndNextChar()
              state = 8
            } else if (nextCh == 70) {
              markAndNextChar()
              state = 9
            } else if (nextCh == 84) {
              markAndNextChar()
              state = 10
            } else if (nextCh == 41) {
              markAndNextChar()
              state = 11
            } else if (nextCh == 40) {
              markAndNextChar()
              state = 12
            } else if (nextCh == 43) {
              markAndNextChar()
              state = 13
            } else if (nextCh == 47) {
              markAndNextChar()
              state = 14
            } else if (nextCh == 42) {
              markAndNextChar()
              state = 15
            } else if (nextCh in 65..69 || nextCh in 71..83 || nextCh in 85..90 || nextCh in 97..100 || nextCh in 102..104 || nextCh == 106 || nextCh == 107 || nextCh in 109..113 || nextCh in 115..122) {
              markAndNextChar()
              state = 16
            } else if (nextCh == -1) {
              markAndNextChar()
              state = 17
            } else if (nextCh in 48..57) {
              markAndNextChar()
              state = 18
            } else {
              markAndNextChar()
              attemptBacktrackOtherwise(TToken.TERROR)
              return
            }
          }
          1 -> {
            if (nextCh == 61) {
              nextChar()
              state = 19
            } else {
              setToken(TToken.TEqual)
              return
            }
          }
          2 -> {
            if (nextCh == 108) {
              nextChar()
              state = 20
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..107 || nextCh in 109..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          3 -> {
            if (nextCh == 102) {
              nextChar()
              state = 21
            } else if (nextCh == 110) {
              nextChar()
              state = 22
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..101 || nextCh in 103..109 || nextCh in 111..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          4 -> {
            setToken(TToken.TSemicolon)
            return
          }
          5 -> {
            if (nextCh == 101) {
              nextChar()
              state = 23
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..100 || nextCh in 102..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          6 -> {
            if (nextCh == 101) {
              nextChar()
              state = 24
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..100 || nextCh in 102..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          7 -> {
            if (nextCh == 62) {
              nextChar()
              state = 25
            } else if (nextCh in 48..57) {
              nextChar()
              state = 18
            } else if (nextCh == 45) {
              nextChar()
              state = 26
            } else {
              setToken(TToken.TDash)
              return
            }
          }
          8 -> {
            setToken(TToken.TBackslash)
            return
          }
          9 -> {
            if (nextCh == 97) {
              nextChar()
              state = 27
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 98..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          10 -> {
            if (nextCh == 114) {
              nextChar()
              state = 28
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..113 || nextCh in 115..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          11 -> {
            setToken(TToken.TRParen)
            return
          }
          12 -> {
            setToken(TToken.TLParen)
            return
          }
          13 -> {
            setToken(TToken.TPlus)
            return
          }
          14 -> {
            setToken(TToken.TSlash)
            return
          }
          15 -> {
            setToken(TToken.TStar)
            return
          }
          16 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          17 -> {
            setToken(TToken.TEOS)
            return
          }
          18 -> {
            if (nextCh in 48..57) {
              nextChar()
              state = 18
            } else {
              setToken(TToken.TLiteralInt)
              return
            }
          }
          19 -> {
            setToken(TToken.TEqualEqual)
            return
          }
          20 -> {
            if (nextCh == 115) {
              nextChar()
              state = 29
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..114 || nextCh in 116..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          21 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIf)
              return
            }
          }
          22 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIn)
              return
            }
          }
          23 -> {
            if (nextCh == 99) {
              nextChar()
              state = 30
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh == 97 || nextCh == 98 || nextCh in 100..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          24 -> {
            if (nextCh == 116) {
              nextChar()
              state = 31
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..115 || nextCh in 117..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          25 -> {
            setToken(TToken.TDashGreaterThan)
            return
          }
          26 -> {
            if (nextCh in 0..9 || nextCh in 11..255) {
              nextChar()
              state = 26
            } else {
              next()
              return
            }
          }
          27 -> {
            if (nextCh == 108) {
              nextChar()
              state = 32
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..107 || nextCh in 109..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          28 -> {
            if (nextCh == 117) {
              nextChar()
              state = 33
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..116 || nextCh in 118..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          29 -> {
            if (nextCh == 101) {
              nextChar()
              state = 34
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..100 || nextCh in 102..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          30 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TRec)
              return
            }
          }
          31 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TLet)
              return
            }
          }
          32 -> {
            if (nextCh == 115) {
              nextChar()
              state = 35
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..114 || nextCh in 116..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          33 -> {
            if (nextCh == 101) {
              nextChar()
              state = 36
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..100 || nextCh in 102..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          34 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TElse)
              return
            }
          }
          35 -> {
            if (nextCh == 101) {
              nextChar()
              state = 37
            } else if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..100 || nextCh in 102..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TIdentifier)
              return
            }
          }
          36 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TTrue)
              return
            }
          }
          37 -> {
            if (nextCh in 48..57 || nextCh in 65..90 || nextCh in 97..122) {
              nextChar()
              state = 16
            } else {
              setToken(TToken.TFalse)
              return
            }
          }
        }
      }
    }
  }
}

enum class TToken {
  TEqual,
  TElse,
  TIf,
  TIn,
  TSemicolon,
  TRec,
  TLet,
  TDashGreaterThan,
  TBackslash,
  TFalse,
  TTrue,
  TRParen,
  TLParen,
  TDash,
  TPlus,
  TSlash,
  TStar,
  TEqualEqual,
  TLiteralInt,
  TIdentifier,
  TEOS,
  TERROR,
}

typealias Token = AbstractToken<TToken>