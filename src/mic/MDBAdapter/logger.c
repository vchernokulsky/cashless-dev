#include "platform.h"

#include <string.h>

char log_buffer[128];
char amnt_buf[8];

#if defined(__PLATFORM_PC__)
	#include <memory.h>
	#include <stdio.h>
#elif defined(__PLATFORM_STM32__)
	#include "board.h"
#endif

void log(const char *msg) {
#if defined(__PLATFORM_PC__)
	printf("%s", msg);
#elif defined(__PLATFORM_STM32__)
	USART2_Send_String(msg);
#endif
}

void log_recv_amount(unsigned short amount) {
	memset(log_buffer, 0x00, 128);
	memset(amnt_buf, 0x00, 8);
	strcat(log_buffer, "RECV AMOUNT: \0");
	itoa(amount, amnt_buf);
	strcat(log_buffer, amnt_buf);
	strcat(log_buffer, "\n\0");
	USART2_Send_String(log_buffer);
}

void log_array(const char *msg, const char *arr, unsigned int arr_len) {
#if  defined(__PLATFORM_PC__)
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
#elif defined(__PLATFORM_STM32__)

#endif
}
