#include <stdio.h>
#include <string.h>

#include "buffer.h"
#include "memory.h"
#include "stringbuilder.h"

StringBuilder *stringbuilder_new(void)
{
    return buffer_new(1);
}

void stringbuilder_free(StringBuilder *sb) {
    buffer_free(sb);
}

char *stringbuilder_free_use(StringBuilder *sb){
    stringbuilder_append_char(sb, '\0');
    char *s = buffer_free_use(sb);
    return s;
}

void stringbuilder_append(StringBuilder *sb, char *s) {
    buffer_append(sb, s, strlen(s));
}

void stringbuilder_append_char(StringBuilder *sb, char c) {
    buffer_append(sb, &c, 1);
}

void stringbuilder_append_int(StringBuilder *sb, int i) {
    char buffer[15];
    sprintf(buffer, "%d", i);
    stringbuilder_append(sb, buffer);
}
