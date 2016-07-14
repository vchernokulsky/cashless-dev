#include <stdlib.h>
#include <stdio.h>

#include "MDBConst.h"
#include "logger.h"
#include "mdb_helper.h"
#include "cashless_protocol.h"

#ifdef __PC_STUB__
	#include <memory.h>
#endif


void test_power_up_sequence() {
	// declare MDB command stub
	unsigned char req_reset[2] = {0x10, 0x10};
	unsigned char req_poll[2] = {0x12, 0x12};
	unsigned char req_setup[7] = {0x11, 0x00, 0x03, 25, 2, 0x01, 0x30};
	unsigned char req_expansion[31] = {0x17, 0x00, 0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3};
	unsigned char req_reader_enable[3] = {0x14, 0x01, 0x15};
	char resp_request_id[31] = {0x09,0x43,0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3};
	// Power-Up Sequence (Cashless Payment Device)
	// //CMD: RESET
	process_message(req_reset);
	// //CMD: POLL
	process_message(req_poll);
	// //CMD: SETUP
	process_message(req_setup);
	  // //CMD: POLL
	process_message(req_poll);
	// //CMD: MAX/MIN PRICE
	req_setup[1]=0x01;
	process_message(req_setup);
	// //CMD: EXPANSION ID REQUEST    
	process_message(req_expansion);
	// //CMD: POLL
	process_message(req_poll);
	// //CMD: READER ENABLE
	process_message(req_reader_enable);
	//unsigned char chk = calculate_checksum(resp_request_id, 30);
}

void test_create_message() {
	int i = 0;
	unsigned short msg_len = 0;
	char buffer[MAX_MSG_LENGTH];
	// declare MDB command stub
	char msg_reset[2] = {0x10, 0x10};
	char msg_poll[2] = {0x12, 0x12};
	char msg_setup[7] = {0x11, 0x00, 0x2A, 0x11, 0x01, 0x00, 0x0A};

	// test command scanner
	for(i=0; i<MAX_MSG_LENGTH; i++) {
		msg_len = check_for_mdb_command(msg_reset[i]);
		buffer[i] = msg_reset[i];
		if(msg_len > 0)
			break;
	}
	printf("CMD LENGTH: %i\n", msg_len);

	msg_len = 0;
	for(i=0; i<MAX_MSG_LENGTH; i++) {
		msg_len = check_for_mdb_command(msg_poll[i]);
		buffer[i] = msg_poll[i];
		if(msg_len > 0)
			break;
	}
	printf("CMD LENGTH: %i\n", msg_len);

	msg_len = 0;
	for(i=0; i<MAX_MSG_LENGTH; i++) {
		msg_len = check_for_mdb_command(msg_setup[i]);
		buffer[i] = msg_setup[i];
		if(msg_len > 0)
			break;
	}
	printf("CMD LENGTH: %i\n", msg_len);
}

void main() {
	//test_power_up_sequence();
	test_create_message();
	system("pause");
}