package stlc.bci

import kotlin.test.Test

class CompilerTest {
    @Test
    fun checkCompile() {
        compileTo("let rec isOdd n = if (n == 0) False else isEven (n - 1); isEven n = if (n == 0) True else isOdd (n - 1) in isOdd 10", "output.bin")
    }
}
