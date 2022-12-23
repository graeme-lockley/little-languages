CC=clang -Ofast
CFLAGS=-pedantic 
LDFLAGS=

SRC_OBJECTS=src/buffer.o src/dis.o src/memory.o src/op.o src/run.o src/stringbuilder.o src/value.o
SRC_MAIN_OBJECTS=src/bci.o
SRC_TARGETS=src/bci

TEST_OBJECTS=test/minunit.o
TEST_MAIN_OBJECTS=test/test-main.o
TEST_TARGETS=test/test-runner

.PHONY: all clean
all: $(SRC_TARGETS) $(TEST_TARGETS)

./src/bci: $(SRC_OBJECTS) src/bci.o
	$(CC) $(LDFLAGS) -o $@ $^

./test/test-runner: $(SRC_OBJECTS) $(TEST_OBJECTS) test/test-runner.o
	$(CC) $(LDFLAGS) -o $@ $^

%.o: %.c ./src/*.h ./test/*.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(SRC_OBJECTS) $(SRC_TARGETS) $(TEST_OBJECTS) $(TEST_TARGETS) $(SRC_MAIN_OBJECTS) $(TEST_MAIN_OBJECTS)
