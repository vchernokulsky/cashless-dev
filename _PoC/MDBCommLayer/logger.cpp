#include "logger.h"
#include <stdio.h>

void log(const char* msg) {
#ifdef __PC_STUB__
	printf("%s", msg);
#endif
}