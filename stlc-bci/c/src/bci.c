#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "dis.h"
#include "op.h"
#include "memory.h"
#include "run.h"
#include "value.h"

void readBinaryFile(char *fileName, unsigned char **block, int32_t *size)
{
  FILE *fp = fopen(fileName, "rb");
  if (fp == NULL)
  {
    printf("File not found: %s\n", fileName);
    exit(1);
  }

  fseek(fp, 0, SEEK_END);
  *size = ftell(fp);
  fseek(fp, 0, SEEK_SET);
  *block = ALLOCATE(unsigned char, *size);
  fread(*block, *size, 1, fp);
  fclose(fp);
}

int32_t main(int argc, char *argv[])
{
  if (argc == 0 || argc == 1)
  {
    printf("Usage: %s [dis | run] [-d] <file>\n", argv[0]);
    exit(1);
  }
  if (strcmp(argv[1], "run") == 0)
  {
    int debug = 0;
    int opt;
    while ((opt = getopt(argc - 1, argv + 1, "d")) != -1)
    {
      switch (opt)
      {
      case 'd':
        debug = 1;
        break;
      default:
        printf("Usage: %s [dis | run] [-d] <file>\n", argv[0]);
        return 1;
      }
    }

    unsigned char *block = NULL;
    int32_t size;

    readBinaryFile(argv[optind + 1], &block, &size);

    int start_memory_allocated = memory_allocated();

    op_initialise();
    value_initialise();

    execute(block, debug);

    value_finalise();
    op_finalise();

    int end_memory_allocated = memory_allocated();

    if (debug)
    {
      printf(". Memory allocated delta: %d\n", end_memory_allocated - start_memory_allocated);

      if (end_memory_allocated > start_memory_allocated)
      {
        printf(". Memory leak detected: %d allocations leaked\n", end_memory_allocated - start_memory_allocated);
      }
    }

    return 0;
  }
  else if (strcmp(argv[1], "dis") == 0)
  {
    unsigned char *block = NULL;
    int32_t size;

    readBinaryFile(argv[2], &block, &size);

    op_initialise();
    dis(block, size);
    op_finalise();

    return 0;
  }
  else
  {
    printf("Unknown command: %s\n", argv[1]);
    return 1;
  }
}
