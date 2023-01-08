#ifndef __SETTINGS_H
#define __SETTINGS_H

/* The size that the buffers in buffer.h are initialised to.  These buffers will
 * automatically expand based on use.  A small size will ensure that minimum 
 * memory is used however it will result in much copying of data to expand the
 * buffer.
 */
#define BUFFER_TRANCHE 2

/* The number of memory allocations before a garbage collection is performed.
 * If insufficient memory is recovered from a collection, then the heap size
 * is double.
 */
#define MACHINE_INITIAL_HEAP_SIZE 2

/* The size of the bytecode's stack in slots when the machine is initialised.
 * The stack will automatically expand based on use.  If the stack is full then
 * the stack size is doubled.
 */
#define MACHINE_INITIAL_STACK_SIZE 2

/* If defined the will cause the machine to display every GC, the duration of 
 * each of the two phases and the number of bytes recovered.
 */
// #define MACHINE_TIME_GC

/* If defined will cause the machine to display detail during GC.  This setting
 * is used when debugging or attempting to understand how the GC works through
 * inspection.
 */
// #define MACHINE_DEBUG_GC

/* If defined will cause the machine to continuously garbage collect. This 
 * setting is used when memory issues are encountered or when changes are made
 * to the GC.
 */
// #define MACHINE_FORCE_GC

/* If defined will cause the machine to record number of allocations and number
 * of frees.  This setting is useful to determine whether or not there are any
 * memory leaks.
 */
// #define MEMORY_DEBUG

#endif
