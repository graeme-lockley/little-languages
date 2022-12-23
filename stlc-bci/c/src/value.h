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
    Colour colour;

    int size;
    int capacity;

    Value *root;
    Value *activation;

    int32_t sp;
    int32_t stackSize;
    Value **stack;
} MemoryState;

extern Value *value_True;
extern Value *value_False;

extern char *value_toString(Value *v);

extern MemoryState value_newMemoryManager(int initialStackSize);
extern void value_destroyMemoryManager(MemoryState *mm);

extern void push(Value *value, MemoryState *mm);
extern Value *pop(MemoryState *mm);
extern void popN(int n, MemoryState *mm);
extern Value *peek(int offset, MemoryState *mm);

extern void forceGC(MemoryState *mm);

extern Value *value_newInt(int i, MemoryState *mm);
extern Value *value_newBool(int b, MemoryState *mm);
extern Value *value_newClosure(Value *previousActivation, int ip, MemoryState *mm);
extern Value *value_newActivation(Value *parentActivation, Value *closure, int nextIp, MemoryState *mm);

extern void value_initialise(void);
extern void value_finalise(void);

extern ValueType value_getType(Value *v);
extern Colour value_getColour(Value *v);

#endif
