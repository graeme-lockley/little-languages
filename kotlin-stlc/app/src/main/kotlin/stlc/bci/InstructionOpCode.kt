package stlc.bci

enum class InstructionOpCode(val code: Byte) {
    PUSH_TRUE(0),
    PUSH_FALSE(1),
    PUSH_INT(2),
    PUSH_VAR(3),
    PUSH_CLOSURE(4),
    PUSH_TUPLE(5),
    ADD(6),
    SUB(7),
    MUL(8),
    DIV(9),
    EQ(10),
    JMP(11),
    JMP_TRUE(12),
    SWAP_CALL(13),
    ENTER(14),
    RET(15),
    STORE_VAR(16)
}