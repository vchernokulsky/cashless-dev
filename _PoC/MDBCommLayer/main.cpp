#include "MDBConst.h"
#include "logger.h"
#include <stdlib.h>
#include <stdio.h>


struct Response {
	int  length;
	char buffer[36];
};

// internal flags
bool balanceReady = false;
// cashless FSM states
unsigned int  _cashless_state = INACTIVE;
unsigned int  _delay_state;
// variables for store MDB response
Response delay_cmd;
Response resp;

void sendMessage(Response* data) {
	printf("RESP: ");
	for(int i=0; i<data->length; i++) {
		unsigned int val = (unsigned int)data->buffer[i];
		printf("0x%02x", val);
		printf(" ");
	}
	printf("\n");
}

void set_response(Response* resp, const char* buffer, int length) {
	resp->length = length;
	for(int i=0; i<length; i++)
		resp->buffer[i] = buffer[i];
}

void clear_response(Response* resp) {
	resp->length = 0;
}

unsigned char calculate_checksum(const char* data, unsigned int length) {
	unsigned short sum = 0;
	for(int i=0; i<length; i++)
		sum += data[i];
	return (unsigned char)(sum & 0x00FF);
}

void process_inactive(unsigned char* data) {
	//define static responses
	char resp_ack[1] = {0x00};
	char resp_just_reset[2] = {0x00, 0x00};
	char resp_config_data[9] = {0x01, 0x01, 0x2A, 0x11, 0x01, 0x00, 0x0A, 0x00, 0x48};
	char resp_request_id[31] = {0x09,0x43,0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3};

	int cmdId = (int)(data[0] & MASK_CMD);
	int subCmdId = -1;
	switch(cmdId) {
		case RESET:
			set_response(&resp, resp_ack, 1);
			sendMessage(&resp);
			set_response(&delay_cmd, resp_just_reset, 2);
			log("(INACTIVE)|RECV:RESET ; SEND: ACK\n");
		break;
		case POLL:
			if(delay_cmd.length>0) {
				sendMessage(&delay_cmd);
				log("(INACTIVE)|RECV:POLL ; SEND: delay_cmd\n");
				clear_response(&delay_cmd);
				if(_delay_state > 0) {
					_cashless_state = _delay_state;
					_delay_state = 0;
				}
			}
			else {
				set_response(&resp, resp_ack, 1);
				sendMessage(&resp);
				log("(INACTIVE)|RECV:POLL ; SEND: ACK\n");
			}
			
		break;
		case SETUP:
			// RESPONSE: Reader Response
			subCmdId = (int)data[1];
			switch (subCmdId){
				case 0x00: // VMC Config Data
					set_response(&delay_cmd, resp_config_data, 9);
					set_response(&resp, resp_ack, 1);
					sendMessage(&resp);
					log("(INACTIVE)|RECV:SETUP [config data] ; SEND: ACK\n");
				break;
				case 0x01: // Max / Min Price
					set_response(&resp, resp_ack, 1);
					sendMessage(&resp);
					log("(INACTIVE)|RECV:SETUP [max min price] ; SEND: ACK\n");
				break;
			}
		break;
		case EXPANSION:
			subCmdId = (int)data[1];
			switch(subCmdId){
				case 0x00: // request id
					set_response(&resp, resp_ack, 1);
					sendMessage(&resp);
					set_response(&delay_cmd, resp_request_id, 31);
					_delay_state = DISABLED;
					log("(INACTIVE)|RECV:EXPANSION [request id]; SEND: ACK\n");
				break;
			}
		break;
	}
}

void process_disabled(unsigned char* data){
	char resp_ack[1] = {0x00};
	char resp_cmd_out_of_sequence[2] = {0x0B, 0x0B};
	char pesn_expansion_id_request[4] = {0x01, 0x02, 0xFF, 0x02};

	int cmdId =    (int)(data[0] & MASK_CMD);
	int subCmdId = -1;
	switch(cmdId) {
		case RESET:
			// process RESET command
			set_response(&resp, resp_ack, 1);
			sendMessage(&resp);
			_cashless_state = INACTIVE;
			log("(DISABLED)|RECV:RESET ; SEND: ACK\n");
		break;
		case POLL:
			// process RESET command
			if (delay_cmd.length>0){
				sendMessage(&delay_cmd);
				clear_response(&delay_cmd);
				log("(DISABLED)|RECV:POLL ; SEND: delay_cmd\n");
			} else {
				set_response(&resp, resp_ack, 1);
				sendMessage(&resp);
				log("(DISABLED)|RECV:POLL ; SEND: ACK\n");
			}
		break;
		case READER:
			subCmdId = (int)data[1];
			switch (subCmdId){
				case 0x01: // Reader Enable
					set_response(&resp, resp_ack, 1);
					sendMessage(&resp);
					_cashless_state = ENABLED;
					log("(DISABLED)|RECV:READER [reader enable]; SEND: Reader Enable\n");
				break;
				case 0x00: // Reader Disable
					set_response(&resp, resp_ack, 1);
					sendMessage(&resp);
					log("(DISABLED)|RECV:READER [reader disable]; SEND: Reader Disable\n");
				break;
				case 0x02: // Reader Cancel
					set_response(&delay_cmd,resp_cmd_out_of_sequence,2);
				break;
			}
		break;
		case EXPANSION:
			if (subCmdId == 0x00) { // EXPANSION ID REQUEST 
				set_response(&resp, resp_ack, 1);
				sendMessage(&resp);
				log("(DISABLED)|RECV:EXPANSION ; SEND: ACK\n");
				set_response(&delay_cmd,pesn_expansion_id_request,4);
			}
		break;
	}
}

void process_enabled(unsigned char* data){
	char resp_ack[1] = {0x00};

	int cmdId =    (int)data[0];
	int subCmdId = -1;
	switch (cmdId){
		case POLL: 
			if (!balanceReady){
				// balance is not ready
				// Send ACK to VMC
				set_response(&resp, resp_ack, 1);
				sendMessage(&resp);
			} else {
				// balance value is available
				// send balance array !!!
			}
		break; 
	}
}

void process_session_idle(unsigned char* data){
	int cmdId =    (int)data[0];
	int subCmdId = -1;
	switch (cmdId){
		case VEND:
			subCmdId = (int)data[1];
			switch(subCmdId) {
				case 0x00: // Vend Request
					/*
					var value = null;
					itemPrice = ((value | data[2]) << 8) | data[3];  //item price SCALED!!!
					//console.log('\n');
					sendMessage([_MDB.COMMON_MSG.ACK]);
					state = _MDB.CASHLESS_STATE.VEND; 
					//console.log('(IDLE)|RECV:VEND ; SEND: ACK (Vend Request)');
					debugger;
					*/
				break;
				case 0x04: // Session Complete
					/*
					sendMessage([_MDB.COMMON_MSG.ACK]);
					//console.log('(IDLE)|RECV:VEND ; SEND: ACK (Session Complete)');
					debugger;
					*/
				break;
				// другие sub 
			}
		break;
		case POLL:
			/*
			// send End Session
			//console.log(' --- (IDLE)|RECV:POLL ; TOTAL COMAND IS: ' + cmd);
			sendMessage([0x07, 0x07]);
			lastCmd = [0x07, 0x07];
			state = _MDB.CASHLESS_STATE.ENABLED; 
			//console.log('(IDLE)|RECV:POLL ; SEND: 0x07 (End Session)');
			// end Session => set to zero balance
			balanceReady = false;
			debugger;
			*/
		break;
	}
}

void process_vend(unsigned char* data){
	int cmdId =    (int)data[0];
	int subCmdId = -1;
	switch (cmdId){
		case POLL:
			/*
			curBalance -= itemPrice;
			var tmp = [];
			for(var i=3; i>0; i--) {
				tmp[i] = curBalance >> 8*i;
			}
			chk = _MDB.calcChkByte([ 0x03, tmp[0], tmp[1]]);                
			// send Vend Approved
			sendMessage([0x03, tmp[0], tmp[1], chk]);
			lastCmd = [0x03, tmp[0], tmp[1], chk];
			//console.log('(ENABLED)|RECV:POLL ; SEND: Vend Approved');
			*/
		break; 
		case VEND:
			subCmdId = (int)data[1];
			switch(subCmdId) {
				/*
				case 0x02: // VEND SUCCESS
				sendMessage([_MDB.COMMON_MSG.ACK]);
				state = _MDB.CASHLESS_STATE.IDLE;
				//console.log('(ENABLED)|RECV:POLL ; SEND: ACK (VEND SUCCESS)');
				break;
				*/
			}
			// другие sub
		break;
	}
}

void process_message(unsigned char* data) {
	int cmd = (int)(data[0] & MASK_CMD);
	switch(_cashless_state) {
		case INACTIVE:
			process_inactive(data);
		break;
		case DISABLED:
			process_disabled(data);
		break;
		case ENABLED:
			process_enabled(data);
		break;
		case SESSION_IDLE:
			process_session_idle(data);
		break;
		case STATE_VEND:
			process_vend(data);
		break;
	}
}

void main() {
	// Power-Up Sequence (Cashless Payment Device)
	// //CMD: RESET
	unsigned char req_reset[2] = {0x10, 0x10};
	process_message(req_reset);
	// //CMD: POLL
	unsigned char req_poll[2] = {0x12, 0x12};
	process_message(req_poll);
	// //CMD: SETUP
	unsigned char req_setup[7] = {0x11, 0x00, 0x03, 25, 2, 0x01, 0x30};
	process_message(req_setup);
	  // //CMD: POLL
	process_message(req_poll);
	// //CMD: MAX/MIN PRICE
	req_setup[1]=0x01;
	process_message(req_setup);
	// //CMD: EXPANSION ID REQUEST    
	unsigned char req_expansion[31] = {0x17, 0x00, 0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3};
	process_message(req_expansion);
	// //CMD: POLL
	process_message(req_poll);
	// //CMD: READER ENABLE
	unsigned char req_reader_enable[3] = {0x14, 0x01, 0x15};
	process_message(req_reader_enable);

	char resp_request_id[31] = {0x09,0x43,0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3};
	unsigned char chk = calculate_checksum(resp_request_id, 30);
	system("pause");
}