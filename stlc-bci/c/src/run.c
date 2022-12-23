#include <stdio.h>

#include "memory.h"
#include "value.h"

#include "op.h"

#define DEFAULT_STACK_SIZE 256

struct State
{
    unsigned char *block;
    int32_t ip;

    MemoryState memoryState;
};

static struct State initState(unsigned char *block)
{
    struct State state;

    state.block = block;
    state.ip = 0;
    state.memoryState = value_newMemoryManager(DEFAULT_STACK_SIZE);
    state.memoryState.activation = value_newActivation(NULL, NULL, -1, &state.memoryState);

    return state;
}

static int32_t readIntFrom(struct State *state, int offset)
{
    unsigned char *block = state->block;

    int32_t size = (int32_t)(block[offset] |
                             ((block[offset + 1]) << 8) |
                             ((block[offset + 2]) << 16) |
                             ((block[offset + 3]) << 24));

    return size;
}

static void logInstruction(struct State *state)
{
    printf("%d: ", state->ip);
    Instruction *instruction = find(state->block[state->ip]);
    if (instruction == NULL)
        printf("Unknown opcode: %d", state->block[state->ip]);
    else
    {
        printf("%s", instruction->name);
        if (instruction->arity > 0)
        {
            printf(" ");
            for (int i = 0; i < instruction->arity; i++)
            {
                if (i > 0)
                    printf(" ");
                printf("%d", readIntFrom(state, state->ip + 1 + i * 4));
            }
        }
    }
    printf(": [");

    for (int i = 0; i < state->memoryState.sp; i++)
    {
        // printf("--- %d of %d\n", i, state->memoryState.sp);
        char *value = value_toString(state->memoryState.stack[i]);
        printf("%s", value);
        FREE(value);
        // printf("\n");
        if (i < state->memoryState.sp - 1)
            printf(", ");
    }
    printf("] ");
    // printf("\n");

    char *a = value_toString(state->memoryState.activation);
    printf("%s ", a);
    FREE(a);

    printf("\n");
}

static int32_t readInt(struct State *state)
{
    int32_t result = readIntFrom(state, state->ip);
    state->ip += 4;
    return result;
}

void execute(unsigned char *block, int debug)
{
    struct State state = initState(block);

    while (1)
    {
        // forceGC(&state.memoryState);
        if (debug)
        {
            logInstruction(&state);
        }
        int opcode = (int)block[state.ip++];

        switch (opcode)
        {
        case PUSH_TRUE:
            push(value_True, &state.memoryState);
            break;
        case PUSH_FALSE:
            push(value_False, &state.memoryState);
            break;
        case PUSH_INT:
        {
            int32_t value = readInt(&state);
            value_newInt(value, &state.memoryState);
            break;
        }
        case PUSH_VAR:
        {
            int32_t index = readInt(&state);
            int32_t offset = readInt(&state);

            Value *a = state.memoryState.activation;
            while (index > 0)
            {
                if (value_getType(a) != VActivation)
                {
                    printf("Run: PUSH_VAR: intermediate not an activation record: %d\n", index);
                    exit(1);
                }
                a = a->data.a.closure->data.c.previousActivation;
                index--;
            }
            if (value_getType(a) != VActivation)
            {
                printf("Run: PUSH_VAR: not an activation record: %d\n", index);
                exit(1);
            }
            if (a->data.a.state == NULL)
            {
                printf("Run: PUSH_VAR: activation has no state\n");
                exit(1);
            }
            if (offset >= a->data.a.stateSize)
            {
                printf("Run: PUSH_VAR: offset out of bounds: %d >= %d\n", offset, a->data.a.stateSize);
                exit(1);
            }
            push(a->data.a.state[offset], &state.memoryState);

            break;
        }
        case PUSH_CLOSURE:
        {
            int32_t targetIP = readInt(&state);
            value_newClosure(state.memoryState.activation, targetIP, &state.memoryState);
            break;
        }
        case ADD:
        {
            Value *b = pop(&state.memoryState);
            Value *a = pop(&state.memoryState);
            if (value_getType(a) != VInt || value_getType(b) != VInt)
            {
                printf("Run: ADD: not an int\n");
                exit(1);
            }
            value_newInt(a->data.i + b->data.i, &state.memoryState);
            break;
        }
        case SUB:
        {
            Value *b = pop(&state.memoryState);
            Value *a = pop(&state.memoryState);
            if (value_getType(a) != VInt || value_getType(b) != VInt)
            {
                printf("Run: SUB: not an int\n");
                exit(1);
            }
            value_newInt(a->data.i - b->data.i, &state.memoryState);
            break;
        }
        case MUL:
        {
            Value *b = pop(&state.memoryState);
            Value *a = pop(&state.memoryState);
            if (value_getType(a) != VInt || value_getType(b) != VInt)
            {
                printf("Run: MUL: not an int\n");
                exit(1);
            }
            value_newInt(a->data.i * b->data.i, &state.memoryState);
            break;
        }
        case DIV:
        {
            Value *b = pop(&state.memoryState);
            Value *a = pop(&state.memoryState);
            if (value_getType(a) != VInt || value_getType(b) != VInt)
            {
                printf("Run: DIV: not an int\n");
                exit(1);
            }
            value_newInt(a->data.i / b->data.i, &state.memoryState);
            break;
        }
        case EQ:
        {
            Value *b = pop(&state.memoryState);
            Value *a = pop(&state.memoryState);
            if (value_getType(a) != VInt || value_getType(b) != VInt)
            {
                printf("Run: EQ: not an int\n");
                exit(1);
            }
            push(a->data.i == b->data.i ? value_True : value_False, &state.memoryState);
            break;
        }
        case JMP:
        {
            int32_t targetIP = readInt(&state);
            state.ip = targetIP;
            break;
        }
        case JMP_TRUE:
        {
            int32_t targetIP = readInt(&state);
            Value *v = pop(&state.memoryState);
            if (value_getType(v) != VBool)
            {
                printf("Run: JMP_TRUE: not a bool\n");
                exit(1);
            }
            if (v->data.b)
                state.ip = targetIP;
            break;
        }
        case SWAP_CALL:
        {
            Value *newActivation = value_newActivation(state.memoryState.activation, peek(1, &state.memoryState), state.ip, &state.memoryState);
            state.ip = peek(2, &state.memoryState)->data.c.ip;
            state.memoryState.activation = newActivation;
            state.memoryState.stack[state.memoryState.sp - 3] = state.memoryState.stack[state.memoryState.sp - 2];
            popN(2, &state.memoryState);
            break;
        }
        case ENTER:
        {
            int32_t size = readInt(&state);

            if (state.memoryState.activation->data.a.state == NULL)
            {
                state.memoryState.activation->data.a.stateSize = size;
                state.memoryState.activation->data.a.state = ALLOCATE(Value *, size);

                for (int i = 0; i < size; i++)
                    state.memoryState.activation->data.a.state[i] = NULL;
            }
            else
            {
                printf("Run: ENTER: activation already has state\n");
                exit(1);
            }
            break;
        }
        case RET:
        {
            if (state.memoryState.activation->data.a.parentActivation == NULL)
            {
                Value *v = pop(&state.memoryState);
                switch (value_getType(v))
                {
                case VInt:
                    printf("%d: Int\n", v->data.i);
                    break;
                case VBool:
                    printf("%s: Bool\n", v->data.b ? "true" : "false");
                    break;
                case VClosure:
                case VActivation:
                {
                    char *s = value_toString(v);

                    printf("%s\n", s);
                    FREE(s);
                    break;
                }
                }
                value_destroyMemoryManager(&state.memoryState);

                return;
            }
            state.ip = state.memoryState.activation->data.a.nextIP;
            state.memoryState.activation = state.memoryState.activation->data.a.parentActivation;
            break;
        }
        case STORE_VAR:
        {
            int32_t index = readInt(&state);
            Value *value = pop(&state.memoryState);

            if (state.memoryState.activation->data.a.state == NULL)
            {
                printf("Run: STORE_VAR: activation has no state\n");
                exit(1);
            }
            if (index >= state.memoryState.activation->data.a.stateSize)
            {
                printf("Run: STORE_VAR: index out of bounds: %d\n", index);
                exit(1);
            }

            state.memoryState.activation->data.a.state[index] = value;
            break;
        }
        default:
        {
            Instruction *instruction = find(opcode);
            if (instruction == NULL)
                printf("Run: Invalid opcode: %d\n", opcode);
            else
                printf("Run: ip=%d: Unknown opcode: %s (%d)\n", state.ip - 1, instruction->name, instruction->opcode);

            exit(1);
        }
        }
    }
}
