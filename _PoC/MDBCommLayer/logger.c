#include "logger.h"
#include <stdio.h>

#ifdef __PC_STUB__
	#include <memory.h>
	#include <string.h>
#endif

void log(const char *msg) {
#ifdef __PC_STUB__
	printf("%s", msg);
#endif
}

void log_array(const char *msg, const char *arr, unsigned int arr_len) {
#ifdef __PC_STUB__
	unsigned int i = 0;
	char buffer[16];
	char output[512];

	memset(buffer, 0x00, 16);
	memset(output, 0x00, 512);
	for(i=0; i<arr_len; i++) {
		unsigned int val = (unsigned int)arr[i];
		sprintf(buffer, " 0x%02x", val);
		strcat(output, buffer);
	}
	strcat(output, "\n");
	log(output);
#endif
}