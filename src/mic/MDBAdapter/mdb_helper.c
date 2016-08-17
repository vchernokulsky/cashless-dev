#include "platform.h"
// common ANSI libraries
#include <string.h>
//
#include "MDBConst.h"
#include "mdb_helper.h"

#ifdef __PLATFORM_PC__
	#include <stdio.h>
	#include <memory.h>
#elif defined(__PLATFORM_STM32__)
	#include "board.h"
#endif

// define functions specified for STM32 platform
#if defined(__PLATFORM_STM32__)
	void (*UARTwritestream)(uint16_t Data );
	void CashlessProtocoInit(void (*writestream)(uint16_t Data )) {
		UARTwritestream = writestream;
	}
#endif

//fixed arrays with subcommand lengths
unsigned short SUB_SETUP[2] =     {6, 6};
unsigned short SUB_VEND[6] =      {6, 2, 4, 2, 2, 6};
unsigned short SUB_EXPANSION[1] = {31};
unsigned short SUB_READER[3] =    {2, 2, 2};

//variables for construct mdb command
int  cmdId;
int  subCmdId;
int  buffer_length;

unsigned char calculate_checksum(const char* data, unsigned int length) {
	unsigned int i = 0;
	unsigned short sum = 0;
	for(i=0; i<length; i++)
		sum += data[i];
	return (unsigned char)(sum & 0x00FF);
}

unsigned short check_for_mdb_command(char input) {
	unsigned short result = 0;

	buffer_length++;
	if(buffer_length == 1)
		cmdId = (int)(input & MASK_CMD);
	switch(cmdId) {
		case RESET:
			if(buffer_length > 1) {
				result = buffer_length;
				buffer_length = 0;
			}
			break;
		case POLL:
			if(buffer_length > 1) {
				result = buffer_length;
				buffer_length = 0;
			}
			break;
		case SETUP:
			if(buffer_length == 2)
				subCmdId = input;
			// Command length must equal: LEN(CMD) + LEN(CHK)
			if(buffer_length > 1) {
				if(buffer_length > SUB_SETUP[subCmdId]) {
					result = buffer_length;
					buffer_length = 0;
				}
			}
			break;
		case VEND:
			if(buffer_length == 2)
				subCmdId = input;
			// Command length must equal: LEN(CMD) + LEN(CHK)
			if(buffer_length > 1) {
				if(buffer_length > SUB_VEND[subCmdId]) {
					result = buffer_length;
					buffer_length = 0;
				}
			}
			break;
		case READER:
			if(buffer_length == 2)
				subCmdId = input;
			// Command length must equal: LEN(CMD) + LEN(CHK)
			if(buffer_length > 1) {
				if(buffer_length > SUB_READER[subCmdId]) {
					result = buffer_length;
					buffer_length = 0;
				}
			}
			break;
		case EXPANSION:
			if(buffer_length == 2)
				subCmdId = input;
			// Command length must equal: LEN(CMD) + LEN(CHK)
			if(buffer_length > 1) {
				if(buffer_length > SUB_EXPANSION[subCmdId]) {
					result = buffer_length;
					buffer_length = 0;
				}
			}
			break;
	}
	if(buffer_length > MAX_MSG_LENGTH) {
		result = buffer_length;
		buffer_length = 0;
	}

	return result;
}

void send_mdb_command(struct Response *data) {
#ifdef __PLATFORM_PC__
	unsigned int i = 0;
	for(i=0; i<data->length; i++) {
		unsigned int val = (unsigned int)data->buffer[i];
		printf("0x%02x", val);
		printf(" ");
	}
	printf("\n");
#else
	for(int i=0; i< data->length-1; i++) {
			UARTwritestream(data->buffer[i]);
		}
	unsigned short last = (0x0100 | data->buffer[data->length-1]);
	UARTwritestream(last);
#endif
}

void fill_mbd_command(struct Response *resp, const char* buffer, int length) {
	resp->length = length;
	memcpy(resp->buffer, buffer, length);
}

void clear_mdb_command(struct Response *resp) {
	resp->length = 0;
	memset(resp->buffer, 0x00, MAX_MSG_LENGTH);
}

int read_balance() {
	int balance = 0;
#if defined(__PLATFORM_PC__)
	balance = 30;
#elif defined(__PLATFORM_STM32__)
	balance = get_user_balance();
#endif
	return balance;
}

// this fuction for send text command to espruino board
//void send_to_espruino(const char *cmd, unsigned int length) {
//#if defined(__PLATFORM_PC__)
//	unsigned int i = 0;
//	for(i=0; i<length; i++) {
//		unsigned int val = (unsigned int)cmd[i];
//		printf("0x%02x", val);
//		printf(" ");
//	}
//	printf("\n");
//#elif defined(__PLATFORM_STM32__)
//	USART2_Send_String(cmd);
//#endif
//}
