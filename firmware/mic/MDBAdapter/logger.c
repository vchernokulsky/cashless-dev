#include "platform.h"
#include "MDBConst.h"

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

void log_mdb_command(unsigned short stateId, unsigned short cmdId, unsigned short subCmdId) {
	unsigned char tmp_state_str[16];
	unsigned char tmp_str[64];
	unsigned char tmp_num_str[8] = {0,0,0,0,0,0,0,0};
	memset(tmp_str, 0x00, 64);
	// detected dev state
	switch(stateId) {
		case ST_INACTIVE:
			strcat(tmp_str, "(INACTIVE)|UNKNOWN COMMAND [");
			break;
		case ST_ENABLED:
			strcat(tmp_str, "(ENABLED)|UNKNOWN COMMAND [");
			break;
		case ST_IDLE:
			strcat(tmp_str, "(IDLE)|UNKNOWN COMMAND [");
			break;
		case ST_DISABLED:
			strcat(tmp_str, "(DISABLED)|UNKNOWN COMMAND [");
			break;
		case ST_REVALUE:
			strcat(tmp_str, "(REVALUE)|UNKNOWN COMMAND [");
			break;
		case ST_NEGVEND:
			strcat(tmp_str, "(NEGVEND)|UNKNOWN COMMAND [");
			break;
		case ST_VEND:
			strcat(tmp_str, "(VEND)|UNKNOWN COMMAND [");
			break;
		default:
			strcat(tmp_str, "(UNKN)|UNKNOWN COMMAND [");
			break;

	}
	itoa(cmdId, tmp_num_str);
	strcat(tmp_str, tmp_num_str);
	strcat(tmp_str, " ");
	memset(tmp_num_str, 0x00, 8);
	itoa(subCmdId, tmp_num_str);
	strcat(tmp_str, tmp_num_str);
	strcat(tmp_str, "]\n");
	log(tmp_str);
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
