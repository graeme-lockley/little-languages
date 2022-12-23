#include <stdio.h>
#include <string.h>
#include <sys/time.h>

#include "memory.h"
#include "stringbuilder.h"

#include "value.h"

Value *value_True;
Value *value_False;

#define DEFAULT_CAPACITY 256

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
    else if (value_getType(v) == VActivation)
    {
        return 1 + activationDepth(v->data.a.parentActivation);
    }
    else
    {
        return 0;
    }
}

char *value_toString(Value *v)
{
    if (v == NULL)
    {
        return STRDUP("-");
    }

    switch (value_getType(v))
    {
    case VInt:
    {
        char buffer[256];
        // sprintf(buffer, "%d (%p)", v->data.i, (void *)v);
        sprintf(buffer, "%d", v->data.i);
        return STRDUP(buffer);
    }
    case VBool:
        if (v->data.b)
            return STRDUP("true");
        else
            return STRDUP("false");
    case VClosure:
    {
        char buffer[256];
        // sprintf(buffer, "c%d#%d (%p)", v->data.c.ip, activationDepth(v->data.c.previousActivation), (void *)v);
        sprintf(buffer, "c%d#%d", v->data.c.ip, activationDepth(v->data.c.previousActivation));
        return STRDUP(buffer);
    }
    case VActivation:
    {
        StringBuilder *sb = stringbuilder_new();

        char *parentActivation = value_toString(v->data.a.parentActivation);
        char *closure = value_toString(v->data.a.closure);

        stringbuilder_append(sb, "<");
        stringbuilder_append(sb, parentActivation);
        stringbuilder_append(sb, ", ");
        stringbuilder_append(sb, closure);
        stringbuilder_append(sb, ", ");
        if (v->data.a.nextIP == -1)
            stringbuilder_append(sb, "-");
        else
            stringbuilder_append_int(sb, v->data.a.nextIP);
        stringbuilder_append(sb, ", ");

        FREE(closure);
        FREE(parentActivation);

        if (v->data.a.state == NULL)
        {
            stringbuilder_append(sb, "-");
        }
        else
        {
            stringbuilder_append(sb, "[");
            for (int i = 0; i < v->data.a.stateSize; i++)
            {
                char *state = value_toString(v->data.a.state[i]);
                stringbuilder_append(sb, state);
                FREE(state);
                if (i < v->data.a.stateSize - 1)
                    stringbuilder_append(sb, ", ");
            }
            stringbuilder_append(sb, "]");
        }
        stringbuilder_append(sb, ">");

        // char buffer[256];
        // sprintf(buffer, " (%p)", (void *)v);
        // stringbuilder_append(sb, buffer);

        return stringbuilder_free_use(sb);
    }
    default:
        return STRDUP("Unknown value");
    }
}

MemoryState value_newMemoryManager(int initialStackSize)
{
    MemoryState mm;

    mm.colour = VWhite;

    mm.size = 0;
    mm.capacity = DEFAULT_CAPACITY;

    mm.root = NULL;
    mm.activation = NULL;

    mm.sp = 0;
    mm.stackSize = initialStackSize;
    mm.stack = ALLOCATE(Value *, initialStackSize);

    for (int i = 0; i < initialStackSize; i++)
        mm.stack[i] = NULL;

    return mm;
}

void value_destroyMemoryManager(MemoryState *mm)
{
    mm->stackSize = 0;
    mm->sp = 0;
    mm->activation = NULL;

    forceGC(mm);

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

static void mark(Value *v, Colour colour)
{
    if (v == NULL)
        return;

    if (value_getColour(v) == colour)
        return;

#ifdef DEBUG_GC
    ValueType oldValueType = value_getType(v);
    Colour oldColour = value_getColour(v);
#endif

    v->type = (value_getType(v) & 7) | colour;

#ifdef DEBUG_GC
    if (oldValueType != value_getType(v))
    {
        printf("gc: mark: type changed.\n");
        exit(1);
    }
    else if (oldColour == value_getColour(v))
    {
        printf("gc: mark: colour did not change.\n");
        exit(1);
    }
#endif

#ifdef DEBUG_GC
    char *s = value_toString(v);
    printf("gc: marking %s\n", s);
    FREE(s);
#endif

    if (value_getType(v) == VActivation)
    {
        mark(v->data.a.parentActivation, colour);
        mark(v->data.a.closure, colour);
        if (v->data.a.state != NULL)
        {
            for (int i = 0; i < v->data.a.stateSize; i++)
                mark(v->data.a.state[i], colour);
        }
    }
    else if (value_getType(v) == VClosure)
    {
        mark(v->data.c.previousActivation, colour);
    }
}

static void sweep(MemoryState *mm)
{
    Value *v;
#ifdef DEBUG_GC
    v = mm->root;
    while (v != NULL)
    {
        Value *nextV = v->next;
        if (value_getColour(v) != mm->colour)
        {
            char *s = value_toString(v);
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
        if (value_getColour(v) == mm->colour)
        {
            v->next = newRoot;
            newRoot = v;
            newSize++;
        }
        else
        {
            switch (value_getType(v))
            {
            case VInt:
            case VBool:
#ifdef DEBUG_GC
                v->data.i = -1;
#endif
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
        char *s = value_toString(v);
        printf("gc: --- %s\n", s);
        FREE(s);
        v = nextV;
    }
#endif
}

void forceGC(MemoryState *mm)
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
        mark(mm->activation, newColour);
    }
    for (int i = 0; i < mm->sp; i++)
    {
        mark(mm->stack[i], newColour);
    }

    mm->colour = newColour;

#ifdef TIME_GC
    long long endMark = timeInMilliseconds();
#endif
#ifdef DEBUG_GC
    printf("gc: sweeping\n");
#endif
    sweep(mm);

#ifdef TIME_GC
    long long endSweep = timeInMilliseconds();

    printf("gc: mark took %lldms, sweep took %lldms\n", endMark - start, endSweep - endMark);
#endif
}

static void gc(MemoryState *mm)
{
#ifdef GC_FORCE
    forceGC(mm);
#else
    if (mm->size >= mm->capacity)
    {
        forceGC(mm);

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

Value *value_newInt(int i, MemoryState *mm)
{
    gc(mm);

    Value *v = ALLOCATE(Value, 1);
    v->type = VInt | mm->colour;
    v->data.i = i;

    push(v, mm);

    attachValue(v, mm);

    return v;
}
Value *value_newBool(int b, MemoryState *mm)
{
    gc(mm);

    Value *v = ALLOCATE(Value, 1);

    v->type = VBool | mm->colour;
    v->data.b = b;
    attachValue(v, mm);

    push(v, mm);

    return v;
}

Value *value_newClosure(Value *previousActivation, int ip, MemoryState *mm)
{
    gc(mm);

    if (previousActivation != NULL && value_getType(previousActivation) != VActivation)
    {
        printf("Error: value_newClosure: previousActivation is not an activation: %s\n", value_toString(previousActivation));
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

Value *value_newActivation(Value *parentActivation, Value *closure, int nextIp, MemoryState *mm)
{
    gc(mm);

    if (parentActivation != NULL && value_getType(parentActivation) != VActivation)
    {
        printf("Error: value_newActivation: parentActivation is not an activation: %s\n", value_toString(parentActivation));
        exit(1);
    }
    if (closure != NULL && value_getType(closure) != VClosure)
    {
        printf("Error: value_newActivation: closure is not a closure: %s\n", value_toString(closure));
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

void value_initialise(void)
{
    internalMM = value_newMemoryManager(2);

    value_True = value_newBool(1, &internalMM);
    value_False = value_newBool(0, &internalMM);
}

void value_finalise(void)
{
    value_destroyMemoryManager(&internalMM);

    value_True = NULL;
    value_False = NULL;
}

ValueType value_getType(Value *v)
{
    return v->type & 0x7;
}

Colour value_getColour(Value *v)
{
    return v->type & 0x8;
}
