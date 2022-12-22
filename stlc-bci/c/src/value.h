#ifndef VALUE_H
#define VALUE_H

typedef enum {
    VInt,
    VBool,
    VClosure,
    VActivation
} ValueType;

typedef struct Activation {
    struct Value *parentActivation;
    struct Value *closure;
    int nextIP; 
    int stateSize;
    struct Value **state;
} Activation;

typedef struct Closure {
    struct Value *previousActivation;
    int ip;
} Closure;

typedef struct Value {
    ValueType type;
    union {
        int i;
        int b;
        struct Closure c;
        struct Activation a;
    } data;
} Value;

extern Value *value_True;
extern Value *value_False;

extern char *value_toString(Value *v);

extern Value *value_newInt(int i);
extern Value *value_newBool(int b);
extern Value *value_newClosure(Value *previousActivation, int ip);
extern Value *value_newActivation(Value *parentActivation, Value *closure, int nextIp, int stateSize);

extern void value_initialise(void);

#endif
