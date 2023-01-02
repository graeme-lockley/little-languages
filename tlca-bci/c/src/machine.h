#ifndef MACHINE_H
#define MACHINE_H

struct State;

typedef struct {
    char *name;
    void (*function)(struct State *state);
} Builtin;

typedef enum {
    VBlack = 16,
    VWhite = 0
} Colour;

typedef enum {
    VActivation,
    VBool,
    VBuiltin,
    VBuiltinClosure,
    VClosure,
    VData,
    VInt,
    VString,
    VTuple,
    VUnit
} ValueType;

typedef struct Activation {
    struct Value *parentActivation;
    struct Value *closure;
    int nextIP; 
    int stateSize;
    struct Value **state;
} Activation;

typedef struct BuiltinClosure {
    struct Value *previous;
    struct Value *argument;
    void (*function)(struct State *state);
} BuiltinClosure;

typedef struct Closure {
    struct Value *previousActivation;
    int ip;
} Closure;

typedef struct Data {
    int meta;
    int id;
    int size;
    struct Value **values;
} Data;

typedef struct Tuple {
    int size;
    struct Value **values;
} Tuple;

typedef struct Value {
    Colour colour;
    ValueType type;
    union {
        struct Activation a;
        int b;
        Builtin *bi;
        BuiltinClosure bc;
        struct Closure c;
        struct Data d;
        int i;
        struct Tuple t;
        char *s;
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

struct State
{
    unsigned char *block;
    int32_t ip;

    MemoryState memoryState;
};

struct DataNames {
    int32_t count;
    char **names;
};

extern Value *machine_True;
extern Value *machine_False;
extern Value *machine_Unit;

enum ValueToStringStyle {
    VSS_Raw = 0,
    VSS_Literal = 1,
    VSS_Typed
};

extern char *machine_toString(Value *v, enum ValueToStringStyle style, struct State *state);

extern MemoryState machine_newMemoryManager(int initialStackSize);
extern void machine_destroyMemoryManager(MemoryState *mm, struct State *state);

extern void push(Value *value, MemoryState *mm);
extern Value *pop(MemoryState *mm);
extern void popN(int n, MemoryState *mm);
extern Value *peek(int offset, MemoryState *mm);

extern void forceGC(MemoryState *mm, struct State *state);

extern Value *machine_newActivation(Value *parentActivation, Value *closure, int nextIp, MemoryState *mm, struct State *state);
extern Value *machine_newBool(int b, MemoryState *mm, struct State *state);
extern Value *machine_newBuiltin(Builtin *builtin, MemoryState *mm, struct State *state);
extern Value *machine_newBuiltinClosure(Value *previous, Value *argument, void (*function)(struct State *state), MemoryState *mm, struct State *state);
extern Value *machine_newClosure(Value *previousActivation, int ip, MemoryState *mm, struct State *state);
extern Value *machine_newData(int32_t meta, int32_t id, int32_t size, Value **values, MemoryState *mm, struct State *state);
extern Value *machine_newInt(int i, MemoryState *mm, struct State *state);
extern Value *machine_newString(char *s, MemoryState *mm, struct State *state);
extern Value *machine_newString_reference(char *s, MemoryState *mm, struct State *state);
extern Value *machine_newTuple(int32_t size, Value **values, MemoryState *mm, struct State *state);

extern void machine_initialise(void);
extern void machine_finalise(void);

#define machine_getType(v) ((ValueType) ((v)->type & 0xf))
#define machine_getColour(v) ((Colour) ((v)->type  & 0x10))

extern struct State machine_initState(unsigned char *block);
extern void machine_destroyState(struct State *state);

extern int32_t machine_readIntFrom(struct State *state, int offset);
extern char *machine_readStringFrom(struct State *state, int offset);
extern struct DataNames *machine_readDataNamesFrom(struct State *state, int offset);
extern void machine_freeDataNames(struct DataNames *dataNames);

#endif
