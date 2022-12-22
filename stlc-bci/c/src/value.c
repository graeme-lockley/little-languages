#include <stdio.h>
#include <string.h>

#include "memory.h"
#include "stringbuilder.h"

#include "value.h"

Value *value_True;
Value *value_False;

static int activationDepth(Value *v)
{
    if (v == NULL)
    {
        return 0;
    }
    else if (v->type == VActivation)
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

    switch (v->type)
    {
    case VInt:
    {
        char buffer[15];
        sprintf(buffer, "%d: Int", v->data.i);
        return STRDUP(buffer);
    }
    case VBool:
        if (v->data.b)
            return STRDUP("true: Bool");
        else
            return STRDUP("false: Bool");
    case VClosure:
    {
        char buffer[32];
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

        return stringbuilder_free_use(sb);
    }
    default:
        return STRDUP("Unknown value");
    }
}

Value *value_newInt(int i)
{
    Value *v = ALLOCATE(Value, 1);

    v->type = VInt;
    v->data.i = i;

    return v;
}
Value *value_newBool(int b)
{
    Value *v = ALLOCATE(Value, 1);

    v->type = VBool;
    v->data.b = b;

    return v;
}

Value *value_newClosure(Value *previousActivation, int ip)
{
    if (previousActivation != NULL && previousActivation->type != VActivation)
    {
        printf("Error: value_newClosure: previousActivation is not an activation: %s\n", value_toString(previousActivation));
        exit(1);
    }

    Value *v = ALLOCATE(Value, 1);

    v->type = VClosure;
    v->data.c.previousActivation = previousActivation;
    v->data.c.ip = ip;

    return v;
}

Value *value_newActivation(Value *parentActivation, Value *closure, int nextIp, int stateSize)
{
    if (parentActivation != NULL && parentActivation->type != VActivation)
    {
        printf("Error: value_newActivation: parentActivation is not an activation: %s\n", value_toString(parentActivation));
        exit(1);
    }

    Value *v = ALLOCATE(Value, 1);

    v->type = VActivation;
    v->data.a.parentActivation = parentActivation;
    v->data.a.closure = closure;
    v->data.a.nextIP = nextIp;
    v->data.a.stateSize = stateSize;

    if (stateSize > 0)
        v->data.a.state = ALLOCATE(Value *, stateSize);
    else
        v->data.a.state = NULL;

    return v;
}

void value_initialise(void)
{
    value_True = value_newBool(1);
    value_False = value_newBool(0);
}
