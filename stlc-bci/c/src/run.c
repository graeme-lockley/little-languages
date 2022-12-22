#include <stdio.h>

#include "memory.h"
#include "value.h"

#include "op.h"

#define DEFAULT_STACK_SIZE 256

struct State
{
    unsigned char *block;
    int32_t ip;
    int32_t sp;

    Value *activation;

    int32_t stackSize;
    Value **stack;
};

static struct State initState(unsigned char *block)
{
    struct State state;

    state.block = block;
    state.ip = 0;
    state.sp = 0;
    state.activation = value_newActivation(NULL, NULL, -1, 0);
    state.stackSize = DEFAULT_STACK_SIZE;
    state.stack = ALLOCATE(Value *, DEFAULT_STACK_SIZE);

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

    for (int i = 0; i < state->sp; i++)
    {
        char *value = value_toString(state->stack[i]);
        printf("%s", value);
        FREE(value);
        if (i < state->sp - 1)
            printf(", ");
    }
    printf("] ");

    char *a = value_toString(state->activation);
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

static void push(struct State *state, Value *value)
{
    if (state->sp == state->stackSize)
    {
        state->stackSize *= 2;
        state->stack = REALLOCATE(state->stack, Value *, state->stackSize);
    }

    state->stack[state->sp++] = value;
}

static Value *pop(struct State *state)
{
    if (state->sp == 0)
    {
        printf("Run: pop: stack is empty\n");
        exit(1);
    }

    return state->stack[--state->sp];
}

void execute(unsigned char *block, int debug)
{
    struct State state = initState(block);

    while (1)
    {
        if (debug)
        {
            logInstruction(&state);
        }
        int opcode = (int)block[state.ip++];

        switch (opcode)
        {
        case PUSH_TRUE:
            push(&state, value_True);
            break;
        case PUSH_FALSE:
            push(&state, value_False);
            break;
        case PUSH_INT:
        {
            int32_t value = readInt(&state);
            push(&state, value_newInt(value));
            break;
        }
        case PUSH_VAR:
        {
            int32_t index = readInt(&state);
            int32_t offset = readInt(&state);

            Value *a = state.activation;
            while (index > 0)
            {
                if (a->type != VActivation)
                {
                    printf("Run: PUSH_VAR: intermediate not an activation record: %d\n", index);
                    exit(1);
                }
                a = a->data.a.closure->data.c.previousActivation;
                index--;
            }
            if (a->type != VActivation)
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
            push(&state, a->data.a.state[offset]);

            break;
        }
        case PUSH_CLOSURE:
        {
            int32_t targetIP = readInt(&state);
            Value *closure = value_newClosure(state.activation, targetIP);
            push(&state, closure);
            break;
        }
        case ADD:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (a->type != VInt || b->type != VInt)
            {
                printf("Run: ADD: not an int\n");
                exit(1);
            }
            push(&state, value_newInt(a->data.i + b->data.i));
            break;
        }
        case SUB:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (a->type != VInt || b->type != VInt)
            {
                printf("Run: SUB: not an int\n");
                exit(1);
            }
            push(&state, value_newInt(a->data.i - b->data.i));
            break;
        }
        case MUL:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (a->type != VInt || b->type != VInt)
            {
                printf("Run: MUL: not an int\n");
                exit(1);
            }
            push(&state, value_newInt(a->data.i * b->data.i));
            break;
        }
        case DIV:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (a->type != VInt || b->type != VInt)
            {
                printf("Run: DIV: not an int\n");
                exit(1);
            }
            push(&state, value_newInt(a->data.i / b->data.i));
            break;
        }
        case EQ:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (a->type != VInt || b->type != VInt)
            {
                printf("Run: EQ: not an int\n");
                exit(1);
            }
            push(&state, a->data.i == b->data.i ? value_True : value_False);
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
            Value *v = pop(&state);
            if (v->type != VBool)
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
            Value *v = pop(&state);
            Value *closure = pop(&state);
            push(&state, v);
            Value *newActivation = value_newActivation(state.activation, closure, state.ip, 0);
            state.ip = closure->data.c.ip;
            state.activation = newActivation;
            break;
        }
        case ENTER:
        {
            int32_t size = readInt(&state);

            if (state.activation->data.a.state == NULL)
            {
                state.activation->data.a.stateSize = size;
                state.activation->data.a.state = ALLOCATE(Value *, size);

                for (int i = 0; i < size; i++)
                    state.activation->data.a.state[i] = NULL;
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
            if (state.activation->data.a.parentActivation == NULL)
            {
                Value *v = pop(&state);
                char *result = value_toString(v);
                printf("%s\n", result);
                FREE(result);
                exit(0);
            }
            state.ip = state.activation->data.a.nextIP;
            state.activation = state.activation->data.a.parentActivation;
            break;
        }
        case STORE_VAR:
        {
            int32_t index = readInt(&state);
            Value *value = pop(&state);

            if (state.activation->data.a.state == NULL)
            {
                printf("Run: STORE_VAR: activation has no state\n");
                exit(1);
            }
            if (index >= state.activation->data.a.stateSize)
            {
                printf("Run: STORE_VAR: index out of bounds: %d\n", index);
                exit(1);
            }

            state.activation->data.a.state[index] = value;
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
