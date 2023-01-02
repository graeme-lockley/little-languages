#ifndef MEMORY_H
#define MEMORY_H

#define DEBUG_MEMORY

#include <stdlib.h>

#ifdef DEBUG_MEMORY

extern char *memory_alloc(int32_t size, char *file, int line);
extern char *memory_strdup(char *str, char *file, int32_t line);
extern void memory_free(void *ptr, char *file, int32_t line);
extern int32_t memory_allocated(void);

#define ALLOCATE(type, count) \
    (type *)memory_alloc(sizeof(type) * (count), __FILE__, __LINE__)

#define STRDUP(string) \
    (char *)memory_strdup(string, __FILE__, __LINE__)

#define REALLOCATE(pointer, type, count) \
    (type *)realloc(pointer, sizeof(type) * (count))

#define FREE(pointer) \
    memory_free(pointer, __FILE__, __LINE__)

#else

#define ALLOCATE(type, count) \
    (type *)realloc(NULL, sizeof(type) * (count))

#define STRDUP(string) \
    strdup(string)

#define REALLOCATE(pointer, type, count) \
    (type *)realloc(pointer, sizeof(type) * (count))

#define FREE(pointer) \
    ((void)realloc(pointer, 0))

#endif

#endif
