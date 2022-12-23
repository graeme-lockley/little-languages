#ifndef OP_H
#define OP_H

typedef enum
{
    PUSH_TRUE,
    PUSH_FALSE,
    PUSH_INT,
    PUSH_VAR,
    PUSH_CLOSURE,
    PUSH_TUPLE,
    ADD,
    SUB,
    MUL,
    DIV,
    EQ,
    JMP,
    JMP_TRUE,
    SWAP_CALL,
    ENTER,
    RET,
    STORE_VAR
} InstructionOpCode;

typedef enum {
    OPInt,
    OPLabel
} OpParameter;

typedef struct {
    char *name;
    InstructionOpCode opcode;
    int arity;
    OpParameter *parameters;
} Instruction;

extern void op_initialise(void);
extern void op_finalise(void);

extern Instruction* find(InstructionOpCode opcode);
extern Instruction* findOnName(char *name);

#endif
