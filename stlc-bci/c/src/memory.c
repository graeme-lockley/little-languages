#include <stdio.h>
#include <string.h>

#include "memory.h"

static int32_t memory_allocated_count = 0;

char *memory_alloc(int32_t size, char *file, int32_t line)
{
    memory_allocated_count += 1;
    char *mem = realloc(NULL, size);

    if (mem == NULL)
    {
        printf("Out of memory %s:%d\n", __FILE__, __LINE__);
        exit(1);
    }

    return mem;
}

char *memory_strdup(char *string, char *file, int32_t line)
{
    memory_allocated_count += 1;
    char *mem = strdup(string);
    
    if (mem == NULL)
    {
        printf("Out of memory %s:%d\n", __FILE__, __LINE__);
        exit(1);
    }

    return mem;
}

void memory_free(void *ptr, char *file, int32_t line)
{
    memory_allocated_count -= 1;
    (void)realloc(ptr, 0);
}

int32_t memory_allocated(void)
{
    return memory_allocated_count;
}
