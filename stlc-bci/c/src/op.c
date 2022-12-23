#include <stdlib.h>
#include <string.h>

#include "memory.h"

#include "op.h"

Instruction **instructions;

static void initInstruction(InstructionOpCode opcode, char *name, int arity, OpParameter *parameters)
{
    Instruction *i = ALLOCATE(Instruction, 1);

    i->opcode = opcode;
    i->name = name;
    i->arity = arity;
    i->parameters = parameters;

    instructions[opcode] = i;
}

void op_initialise(void)
{
    instructions = ALLOCATE(Instruction *, 18);

#define init(name, arity, parameters) initInstruction(name, #name, arity, parameters)
    init(PUSH_TRUE, 0, NULL);
    init(PUSH_FALSE, 0, NULL);
    init(PUSH_INT, 1, (OpParameter[]){OPInt});
    init(PUSH_VAR, 2, ((OpParameter[]){OPInt, OPInt}));
    init(PUSH_CLOSURE, 1, (OpParameter[]){OPLabel});
    init(PUSH_TUPLE, 1, (OpParameter[]){OPInt});
    init(ADD, 0, NULL);
    init(SUB, 0, NULL);
    init(MUL, 0, NULL);
    init(DIV, 0, NULL);
    init(EQ, 0, NULL);
    init(JMP, 1, (OpParameter[]){OPLabel});
    init(JMP_TRUE, 1, (OpParameter[]){OPLabel});
    init(SWAP_CALL, 0, NULL);
    init(ENTER, 1, (OpParameter[]){OPInt});
    init(RET, 0, NULL);
    init(STORE_VAR, 1, (OpParameter[]){OPInt});
    instructions[17] = NULL;
#undef init
}

void op_finalise(void)
{
    Instruction **i = instructions;
    while (*i != NULL)
    {
        FREE(*i);
        i++;
    }

    FREE(instructions);
    instructions = NULL;
}

Instruction *find(InstructionOpCode opcode)
{
    Instruction **i = instructions;
    while (*i != NULL)
    {
        if ((*i)->opcode == opcode)
        {
            return *i;
        }
        i++;
    }
    return NULL;
}

Instruction *findOnName(char *name)
{
    Instruction **i = instructions;
    while (*i != NULL)
    {
        if (strcmp((*i)->name, name) == 0)
        {
            return *i;
        }
        i++;
    }
    return NULL;
}
