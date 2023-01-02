#include <stdio.h>
#include <string.h>
#include <sys/time.h>

#include "memory.h"
#include "op.h"
#include "stringbuilder.h"

#include "machine.h"

Value *machine_False;
Value *machine_True;
Value *machine_Unit;

#define DEFAULT_HEAP_CAPACITY 2
#define DEFAULT_STACK_SIZE 2

// #define TIME_GC
// #define DEBUG_GC
#define GC_FORCE

static MemoryState internalMM;

static int activationDepth(Value *v)
{
    if (v == NULL)
    {
        return 0;
    }
    else if (machine_getType(v) == VActivation)
    {
        return 1 + activationDepth(v->data.a.parentActivation);
    }
    else
    {
        return 0;
    }
}

static void append_builtin_closure(Value *v, enum ValueToStringStyle style, struct State *state, StringBuilder *sb)
{
    if (machine_getType(v->data.bc.previous) == VBuiltin)
    {
        stringbuilder_append(sb, v->data.bc.previous->data.bi->name);
    }
    else
    {
        append_builtin_closure(v->data.bc.previous, style, state, sb);
    }

    stringbuilder_append(sb, " ");

    char *s = machine_toString(v->data.bc.argument, style, state);
    stringbuilder_append(sb, s);
    FREE(s);
}

static void append_value(Value *v, enum ValueToStringStyle style, struct State *state, StringBuilder *sb)
{
    if (v == NULL)
    {
        stringbuilder_append(sb, "-");
        return;
    }

    switch (machine_getType(v))
    {
    case VActivation:
    {
        stringbuilder_append(sb, "<");
        append_value(v->data.a.parentActivation, style, state, sb);
        stringbuilder_append(sb, ", ");
        append_value(v->data.a.closure, style, state, sb);
        stringbuilder_append(sb, ", ");
        if (v->data.a.nextIP == -1)
            stringbuilder_append(sb, "-");
        else
            stringbuilder_append_int(sb, v->data.a.nextIP);
        stringbuilder_append(sb, ", ");

        if (v->data.a.state == NULL)
        {
            stringbuilder_append(sb, "-");
        }
        else
        {
            stringbuilder_append(sb, "[");
            for (int i = 0; i < v->data.a.stateSize; i++)
            {
                append_value(v->data.a.state[i], style, state, sb);
                if (i < v->data.a.stateSize - 1)
                    stringbuilder_append(sb, ", ");
            }
            stringbuilder_append(sb, "]");
        }
        stringbuilder_append(sb, ">");

        break;
    }
    case VBool:
        stringbuilder_append(sb, v->data.b ? "true" : "false");
        break;
    case VBuiltin:
        stringbuilder_append(sb, v->data.bi->name);
        break;
    case VBuiltinClosure:
        stringbuilder_append(sb, "<");
        append_builtin_closure(v, style, state, sb);
        stringbuilder_append(sb, ">");
        break;
    case VClosure:
        if (style == VSS_Raw)
        {
            stringbuilder_append(sb, "c");
            stringbuilder_append_int(sb, v->data.c.ip);
            stringbuilder_append(sb, "#");
            stringbuilder_append_int(sb, activationDepth(v->data.c.previousActivation));
        }
        else
        {
            stringbuilder_append(sb, "function");
        }
        break;
    case VData:
    {
        struct DataNames *names = machine_readDataNamesFrom(state, v->data.d.meta);

        stringbuilder_append(sb, names->names[v->data.d.id + 1]);
        for (int i = 0; i < v->data.d.size; i++)
        {
            stringbuilder_append(sb, " ");
            if (machine_getType(v->data.d.values[i]) == VData && v->data.d.values[i]->data.d.size > 0)
            {
                stringbuilder_append(sb, "(");
                append_value(v->data.d.values[i], style, state, sb);
                stringbuilder_append(sb, ")");
            }
            else
            {
                append_value(v->data.d.values[i], style, state, sb);
            }
        }

        machine_freeDataNames(names);
        break;
    }
    case VInt:
        stringbuilder_append_int(sb, v->data.i);
        break;
    case VString:
        if (style == VSS_Raw)
        {
            stringbuilder_append(sb, v->data.s);
        }
        else
        {
            // stringbuilder_append(sb, v->data.s);
            stringbuilder_append(sb, "\"");
            char *runner = v->data.s;
            while (*runner != '\0')
            {
                if (*runner == '"' || *runner == '\\')
                {
                    stringbuilder_append_char(sb, '\\');
                }
                stringbuilder_append_char(sb, *runner);
                runner++;
            }
            stringbuilder_append(sb, "\"");
        }
        break;
    case VTuple:
        stringbuilder_append(sb, "(");
        for (int i = 0; i < v->data.t.size; i++)
        {
            append_value(v->data.t.values[i], style, state, sb);
            if (i < v->data.t.size - 1)
                stringbuilder_append(sb, ", ");
        }
        stringbuilder_append(sb, ")");
        break;
    case VUnit:
        stringbuilder_append(sb, "()");
        break;
    default:
    {
        stringbuilder_append(sb, "Unknown value - ");
        stringbuilder_append_int(sb, machine_getType(v));
        stringbuilder_append(sb, " (");
        stringbuilder_append_int(sb, v->type);
        stringbuilder_append(sb, ")");
    }
    }
}

static void append_type(Value *v, enum ValueToStringStyle style, struct State *state, StringBuilder *sb)
{
    if (v != NULL)
    {
        switch (machine_getType(v))
        {
        case VActivation:
        {
            stringbuilder_append(sb, "Activation");
            break;
        }
        case VBool:
            stringbuilder_append(sb, "Bool");
            break;
        case VBuiltin:
            stringbuilder_append(sb, "Builtin");
            break;
        case VBuiltinClosure:
            stringbuilder_append(sb, "BuiltinClosure");
            break;
        case VClosure:
        {
            stringbuilder_append(sb, "Closure");
            break;
        }
        case VData:
        {
            struct DataNames *names = machine_readDataNamesFrom(state, v->data.d.meta);
            stringbuilder_append(sb, names->names[0]);
            machine_freeDataNames(names);
            break;
        }
        case VInt:
            stringbuilder_append(sb, "Int");
            break;
        case VString:
            stringbuilder_append(sb, "String");
            break;
        case VTuple:
        {
            stringbuilder_append(sb, "(");
            for (int i = 0; i < v->data.t.size; i++)
            {
                append_type(v->data.t.values[i], style, state, sb);
                if (i < v->data.t.size - 1)
                    stringbuilder_append(sb, " * ");
            }
            stringbuilder_append(sb, ")");
            break;
        }
        case VUnit:
            stringbuilder_append(sb, "Unit");
            break;
        default:
        {
            stringbuilder_append(sb, "Unknown value - ");
            stringbuilder_append_int(sb, machine_getType(v));
            stringbuilder_append(sb, " (");
            stringbuilder_append_int(sb, v->type);
            stringbuilder_append(sb, ")");
        }
        }
    }
}

char *machine_toString(Value *v, enum ValueToStringStyle style, struct State *state)
{
    StringBuilder *sb = stringbuilder_new();
    append_value(v, style, state, sb);
    if (style == VSS_Typed)
    {
        stringbuilder_append(sb, ": ");
        append_type(v, style, state, sb);
    }
    return stringbuilder_free_use(sb);
}

MemoryState machine_newMemoryManager(int initialStackSize)
{
    MemoryState mm;

    mm.colour = VWhite;

    mm.size = 0;
    mm.capacity = DEFAULT_HEAP_CAPACITY;

    mm.root = NULL;
    mm.activation = NULL;

    mm.sp = 0;
    mm.stackSize = initialStackSize;
    mm.stack = ALLOCATE(Value *, initialStackSize);

    for (int i = 0; i < initialStackSize; i++)
        mm.stack[i] = NULL;

    return mm;
}

void machine_destroyMemoryManager(MemoryState *mm, struct State *state)
{
    mm->stackSize = 0;
    mm->sp = 0;
    mm->activation = NULL;

    forceGC(mm, state);
    forceGC(mm, state);

    FREE(mm->stack);
}

void push(Value *value, MemoryState *mm)
{
    if (mm->sp == mm->stackSize)
    {
        mm->stackSize *= 2;
        mm->stack = REALLOCATE(mm->stack, Value *, mm->stackSize);

        for (int i = mm->sp; i < mm->stackSize; i++)
            mm->stack[i] = NULL;
    }

    mm->stack[mm->sp++] = value;
}

Value *pop(MemoryState *mm)
{
    if (mm->sp == 0)
    {
        printf("Run: pop: stack is empty\n");
        exit(1);
    }

    return mm->stack[--mm->sp];
}

void popN(int n, MemoryState *mm)
{
    if (mm->sp < n)
    {
        printf("Run: popN: stack is too small\n");
        exit(1);
    }

    mm->sp -= n;
}

Value *peek(int offset, MemoryState *mm)
{
    if (mm->sp <= offset)
    {
        printf("Run: peek: stack is too small\n");
        exit(1);
    }

    return mm->stack[mm->sp - 1 - offset];
}

long long timeInMilliseconds(void)
{
    struct timeval tv;

    gettimeofday(&tv, NULL);
    return (((long long)tv.tv_sec) * 1000) + (tv.tv_usec / 1000);
}

static void mark(Value *v, Colour colour, struct State *state)
{
    if (v == NULL)
        return;

    if (machine_getColour(v) == colour)
        return;

#ifdef DEBUG_GC
    ValueType oldValueType = machine_getType(v);
    Colour oldColour = machine_getColour(v);
#endif

    v->type = (machine_getType(v) & 0xf) | colour;

#ifdef DEBUG_GC
    if (oldValueType != machine_getType(v))
    {
        printf("gc: mark: type changed.\n");
        exit(1);
    }
    else if (oldColour == machine_getColour(v))
    {
        printf("gc: mark: colour did not change.\n");
        exit(1);
    }
#endif

#ifdef DEBUG_GC
    char *s = machine_toString(v, VSS_Raw, state);
    printf("gc: marking %s\n", s);
    FREE(s);
#endif

    if (machine_getType(v) == VActivation)
    {
        mark(v->data.a.parentActivation, colour, state);
        mark(v->data.a.closure, colour, state);
        if (v->data.a.state != NULL)
        {
            for (int i = 0; i < v->data.a.stateSize; i++)
                mark(v->data.a.state[i], colour, state);
        }
    }
    else if (machine_getType(v) == VData)
    {
        for (int i = 0; i < v->data.d.size; i++)
            mark(v->data.d.values[i], colour, state);
    }
    else if (machine_getType(v) == VTuple)
    {
        for (int i = 0; i < v->data.t.size; i++)
            mark(v->data.t.values[i], colour, state);
    }
    else if (machine_getType(v) == VClosure)
    {
        mark(v->data.c.previousActivation, colour, state);
    }
    else if (machine_getType(v) == VBuiltinClosure)
    {
        mark(v->data.bc.previous, colour, state);
        mark(v->data.bc.argument, colour, state);
    }
    else
    {
        int t = machine_getType(v);
        if (t != VInt && t != VBool && t != VString && t != VUnit && t != VBuiltin)
        {
            printf("gc: mark: unknown value type %d\n", t);
            exit(1);
        }
    }
}

static void sweep(MemoryState *mm, struct State *state)
{
    Value *v;
#ifdef DEBUG_GC
    v = mm->root;
    while (v != NULL)
    {
        Value *nextV = v->next;
        if (machine_getColour(v) != mm->colour)
        {
            char *s = machine_toString(v, VSS_Raw, state);
            printf("gc: releasing %s\n", s);
            FREE(s);
        }
        v = nextV;
    }
#endif

    Value *newRoot = NULL;
    int newSize = 0;

    v = mm->root;
    while (v != NULL)
    {
        Value *nextV = v->next;
        if (machine_getColour(v) == mm->colour)
        {
            v->next = newRoot;
            newRoot = v;
            newSize++;
        }
        else
        {
            switch (machine_getType(v))
            {
            case VInt:
            case VBool:
            case VBuiltin:
            case VBuiltinClosure:
            case VUnit:
#ifdef DEBUG_GC
                v->data.i = -1;
#endif
                break;

            case VString:
                FREE(v->data.s);
                break;
            case VTuple:
                FREE(v->data.t.values);
                break;
            case VData:
                FREE(v->data.d.values);
                break;
            case VClosure:
#ifdef DEBUG_GC
                v->data.c.ip = -1;
                v->data.c.previousActivation = NULL;
#endif
                break;
            case VActivation:
                if (v->data.a.state != NULL)
                {
                    FREE(v->data.a.state);
                }
#ifdef DEBUG_GC
                v->data.a.parentActivation = NULL;
                v->data.a.closure = NULL;
                v->data.a.nextIP = -1;
                v->data.a.stateSize = -1;
                v->data.a.state = NULL;
#endif
                break;
            }
            v->type = 0;

            FREE(v);
        }
        v = nextV;
    }

#ifdef TIME_GC
    if (mm->size != newSize)
    {
        printf("gc: collected %d objects, %d remaining\n", mm->size - newSize, newSize);
    }
#endif

    mm->root = newRoot;
    mm->size = newSize;

#ifdef DEBUG_GC
    v = mm->root;
    while (v != NULL)
    {
        Value *nextV = v->next;
        char *s = machine_toString(v, VSS_Raw, state);
        printf("gc: --- %s\n", s);
        FREE(s);
        v = nextV;
    }
#endif
}

void forceGC(MemoryState *mm, struct State *state)
{
#ifdef DEBUG_GC
    printf("gc: forcing garbage collection ------------------------------\n");
#endif

#ifdef TIME_GC
    long long start = timeInMilliseconds();
#endif

    Colour newColour = (mm->colour == VWhite) ? VBlack : VWhite;

    if (mm->activation != NULL)
    {
        mark(mm->activation, newColour, state);
    }
    for (int i = 0; i < mm->sp; i++)
    {
        mark(mm->stack[i], newColour, state);
    }

    mm->colour = newColour;

#ifdef TIME_GC
    long long endMark = timeInMilliseconds();
#endif
#ifdef DEBUG_GC
    printf("gc: sweeping\n");
#endif
    sweep(mm, state);

#ifdef TIME_GC
    long long endSweep = timeInMilliseconds();

    printf("gc: mark took %lldms, sweep took %lldms\n", endMark - start, endSweep - endMark);
#endif
}

static void gc(MemoryState *mm, struct State *state)
{
#ifdef GC_FORCE
    forceGC(mm, state);
#else
    if (mm->size >= mm->capacity)
    {
        forceGC(mm, state);

        if (mm->size >= mm->capacity)
        {
#ifdef DEBUG_GC
            printf("gc: memory still full after gc... increasing heap capacity to %d\n", mm->capacity * 2);
#endif
            mm->capacity *= 2;
        }
    }
#endif
}

static void attachValue(Value *v, MemoryState *mm)
{
    mm->size++;
    v->next = mm->root;
    mm->root = v;
}

Value *machine_newActivation(Value *parentActivation, Value *closure, int nextIp, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    if (parentActivation != NULL && machine_getType(parentActivation) != VActivation)
    {
        printf("Error: machine_newActivation: parentActivation is not an activation: %s\n", machine_toString(parentActivation, VSS_Raw, state));
        exit(1);
    }
    if (closure != NULL && machine_getType(closure) != VClosure)
    {
        printf("Error: machine_newActivation: closure is not a closure: %s\n", machine_toString(closure, VSS_Raw, state));
        exit(1);
    }

    Value *v = ALLOCATE(Value, 1);

    v->type = VActivation | mm->colour;
    v->data.a.parentActivation = parentActivation;
    v->data.a.closure = closure;
    v->data.a.nextIP = nextIp;
    v->data.a.stateSize = -1;
    v->data.a.state = NULL;

    attachValue(v, mm);

    push(v, mm);

    return v;
}

Value *machine_newBool(int b, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VBool | mm->colour;
    v->data.b = b;
    attachValue(v, mm);

    push(v, mm);

    return v;
}

Value *machine_newBuiltin(Builtin *builtin, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VBuiltin | mm->colour;
    v->data.bi = builtin;
    attachValue(v, mm);

    push(v, mm);

    return v;
}

Value *machine_newBuiltinClosure(Value *previous, Value *argument, void (*function)(struct State *state), MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VBuiltinClosure | mm->colour;
    v->data.bc.previous = previous;
    v->data.bc.argument = argument;
    v->data.bc.function = function;
    attachValue(v, mm);

    push(v, mm);

    return v;
}

Value *machine_newClosure(Value *previousActivation, int ip, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    if (previousActivation != NULL && machine_getType(previousActivation) != VActivation)
    {
        printf("Error: machine_newClosure: previousActivation is not an activation: %s\n", machine_toString(previousActivation, VSS_Raw, state));
        exit(1);
    }

    Value *v = ALLOCATE(Value, 1);

    v->type = VClosure | mm->colour;
    v->data.c.previousActivation = previousActivation;
    v->data.c.ip = ip;
    attachValue(v, mm);

    push(v, mm);

    return v;
}

Value *machine_newData(int32_t meta, int32_t id, int32_t size, Value **values, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VData | mm->colour;
    v->data.d.meta = meta;
    v->data.d.id = id;
    v->data.d.size = size;
    v->data.d.values = ALLOCATE(Value *, size);
    for (int i = 0; i < size; i++)
    {
        v->data.d.values[i] = values[i];
    }

    attachValue(v, mm);

    push(v, mm);

    return v;
}

Value *machine_newInt(int i, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);
    v->type = VInt | mm->colour;
    v->data.i = i;

    push(v, mm);

    attachValue(v, mm);

    return v;
}

Value *machine_newString_reference(char *s, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);
    v->type = VString | mm->colour;
    v->data.s = s;

    push(v, mm);

    attachValue(v, mm);

    return v;
}

Value *machine_newString(char *s, MemoryState *mm, struct State *state)
{
    return machine_newString_reference(STRDUP(s), mm, state);
}

Value *machine_newTuple(int32_t size, Value **values, MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VTuple | mm->colour;
    v->data.t.size = size;
    v->data.t.values = ALLOCATE(Value *, size);
    for (int i = 0; i < size; i++)
    {
        v->data.t.values[i] = values[i];
    }

    attachValue(v, mm);

    push(v, mm);

    return v;
}

static Value *machine_newUnit(MemoryState *mm, struct State *state)
{
    gc(mm, state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VUnit | mm->colour;
    attachValue(v, mm);

    push(v, mm);

    return v;
}

void machine_initialise(void)
{
    internalMM = machine_newMemoryManager(2);

    machine_False = machine_newBool(0, &internalMM, NULL);
    machine_True = machine_newBool(1, &internalMM, NULL);
    machine_Unit = machine_newUnit(&internalMM, NULL);
}

void machine_finalise(void)
{
#ifdef DEBUG_GC
    printf("machine_finalise\n");
#endif
    machine_destroyMemoryManager(&internalMM, NULL);

    machine_False = NULL;
    machine_True = NULL;
    machine_Unit = NULL;
}

struct State machine_initState(unsigned char *block)
{
    struct State state;

    state.block = block;
    state.ip = 4;
    state.memoryState = machine_newMemoryManager(DEFAULT_STACK_SIZE);
    state.memoryState.activation = machine_newActivation(NULL, NULL, -1, &state.memoryState, &state);

    return state;
}

void machine_destroyState(struct State *state)
{
    machine_destroyMemoryManager(&state->memoryState, state);
}

int32_t machine_readIntFrom(struct State *state, int offset)
{
    unsigned char *block = state->block;

    int32_t size = (int32_t)(block[offset] |
                             ((block[offset + 1]) << 8) |
                             ((block[offset + 2]) << 16) |
                             ((block[offset + 3]) << 24));

    return size;
}

char *machine_readStringFrom(struct State *state, int offset)
{
    return (char *)state->block + offset;
}

struct DataNames *machine_readDataNamesFrom(struct State *state, int offset)
{
    struct DataNames *dataNames = ALLOCATE(struct DataNames, 1);
    dataNames->count = machine_readIntFrom(state, offset) + 1;
    offset += 4;
    dataNames->names = ALLOCATE(char *, dataNames->count);
    for (int i = 0; i < dataNames->count; i++)
    {
        dataNames->names[i] = machine_readStringFrom(state, offset);
        offset += strlen(dataNames->names[i]) + 1;
    }
    return dataNames;
}

void machine_freeDataNames(struct DataNames *dataNames)
{
    FREE(dataNames->names);
    FREE(dataNames);
}
