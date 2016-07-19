#include "cashless_protocol.h"
#include <stdio.h>
#include <stdlib.h>

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

void test_single_vend_sequence() {
	//TODO: test single vend session
	unsigned char req_poll[2] = {0x12, 0x12};
	unsigned char req_ack[1] = {0x00};
	unsigned char req_vend_request[7] = {0x13, 0x00, 0x00, 0x01, 0x00, 0x01, 0x15};
	unsigned char req_vend_succes[5] = {0x13, 0x02, 0x00, 0x01, 0x16};
	unsigned char req_session_complete[3] = {0x13, 0x04, 0x17};

	//CMD: POLL
	process_message(req_poll);
	//CMD: ACK
	process_message(req_ack);
	//CMD: VEND REQUEST

	// user waiting emulation
	process_message(req_poll);
	process_message(req_poll);
	process_message(req_poll);

	process_message(req_vend_request);
	//CMD: POLL
	process_message(req_poll);
	//CMD: ACK
	process_message(req_ack);
	//CMD: VEND SUCCESS
	process_message(req_vend_succes);
	//CMD: SESSION COMPLETE
	process_message(req_session_complete);
	//CMD: POLL
	process_message(req_poll);
	//CMD: ACK
	process_message(req_ack);
}


void main(void) {
	int charcode;
	int val = atoi("00015");
	printf("%i", val);
	//test_power_up_sequence();
	//test_single_vend_sequence();
	charcode = getchar();
}