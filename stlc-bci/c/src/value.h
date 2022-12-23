#ifndef VALUE_H
#define VALUE_H

typedef enum {
    VBlack = 8,
    VWhite = 0
} Colour;

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
    Colour colour;
    ValueType type;
    union {
        int i;
        int b;
        struct Closure c;
        struct Activation a;
    } data;
    struct Value *next;
} Value;

typedef struct {
    int size;
    int capacity;

    int32_t stackSize;
    Value **stack;
} MemoryState;

extern Value *value_True;
extern Value *value_False;

extern char *value_toString(Value *v);

extern Value *value_newInt(int i);
extern Value *value_newBool(int b);
extern Value *value_newClosure(Value *previousActivation, int ip);
extern Value *value_newActivation(Value *parentActivation, Value *closure, int nextIp, int stateSize);

extern void value_initialise(void);
extern void value_finalise(void);

extern ValueType value_getType(Value *v);
extern Colour value_getColour(Value *v);

#endif
