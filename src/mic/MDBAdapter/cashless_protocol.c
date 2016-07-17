#include <stdio.h>

#include "MDBConst.h"
#include "mdb_helper.h"
#include "board.h"
//#include "logger.h"

// declare specific constants
unsigned short MAX_AMOUNT_VALUE = 65000;

// internal flags
unsigned short      balanceReady = 0x00; // true
unsigned short isSessionCanceled = 0x00; // false
unsigned short isRefundCompleted = 0x00; // false
unsigned short isSessionComplete = 0x00; // false

// for success single vend scenario
unsigned int  item_price = 0;
unsigned int cur_balance = 0;


// cashless FSM states
unsigned int  _cashless_state = ST_INACTIVE;
unsigned int  _delay_state;
// variables for store MDB response
struct Response delay_cmd;
struct Response last_cmd;
struct Response resp;


void log(const char *msg) {}


void getBalanceArray(unsigned short tmpBalance, char* result){
	char chk;
	result[0] = 0x03;
	result[1] = (char)(tmpBalance >> 8);
	result[2] = (char)(tmpBalance & 0x00FF);
	chk = calculate_checksum(result,4); 
	result[3] = chk;
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
			fill_mbd_command(&resp, resp_ack, 1);
			send_mdb_command(&resp);
			fill_mbd_command(&delay_cmd, resp_just_reset, 2);
			log("(INACTIVE)|RECV:RESET ; SEND: ACK\n");
		break;
		case POLL:
			if(delay_cmd.length>0) {
				send_mdb_command(&delay_cmd);
				log("(INACTIVE)|RECV:POLL ; SEND: delay_cmd\n");
				clear_mdb_command(&delay_cmd);
				if(_delay_state > 0) {
					_cashless_state = _delay_state;
					_delay_state = 0;
				}
			}
			else {
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(INACTIVE)|RECV:POLL ; SEND: ACK\n");
			}
			
		break;
		case SETUP:
			// RESPONSE: Reader Response
			subCmdId = (int)data[1];
			switch (subCmdId){
				case 0x00: // VMC Config Data
					fill_mbd_command(&delay_cmd, resp_config_data, 9);
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(INACTIVE)|RECV:SETUP [config data] ; SEND: ACK\n");
				break;
				case 0x01: // Max / Min Price
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(INACTIVE)|RECV:SETUP [max min price] ; SEND: ACK\n");
				break;
			}
		break;
		case EXPANSION:
			subCmdId = (int)data[1];
			switch(subCmdId){
				case 0x00: // request id
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					fill_mbd_command(&delay_cmd, resp_request_id, 31);
					_delay_state = ST_DISABLED;
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
			fill_mbd_command(&resp, resp_ack, 1);
			send_mdb_command(&resp);
			_cashless_state = ST_INACTIVE;
			log("(DISABLED)|RECV:RESET ; SEND: ACK\n");
		break;
		case POLL:
			// process RESET command
			if (delay_cmd.length>0){
				send_mdb_command(&delay_cmd);
				clear_mdb_command(&delay_cmd);
				log("(DISABLED)|RECV:POLL ; SEND: delay_cmd\n");
			} else {
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(DISABLED)|RECV:POLL ; SEND: ACK\n");
			}
		break;
		case READER:
			subCmdId = (int)data[1];
			switch (subCmdId){
				case 0x01: // Reader Enable
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					_cashless_state = ST_ENABLED;
					// SEND to Espruino
					USART2_Send_String("POWERUP:00000000");
					log("(DISABLED)|RECV:READER [reader enable]; SEND: Reader Enable\n");
				break;
				case 0x00: // Reader Disable
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(DISABLED)|RECV:READER [reader disable]; SEND: Reader Disable\n");
				break;
				case 0x02: // Reader Cancel
					fill_mbd_command(&delay_cmd,resp_cmd_out_of_sequence,2);
				break;
			}
		break;
		case EXPANSION:
			if (subCmdId == 0x00) { // EXPANSION ID REQUEST 
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(DISABLED)|RECV:EXPANSION ; SEND: ACK\n");
				fill_mbd_command(&delay_cmd,pesn_expansion_id_request,4);
			}
		break;
	}
}

void process_enabled(unsigned char* data){
	char resp_ack[1] = {0x00};
	char result[4] = {0,0,0,0};

	int cmdId =    (int)(data[0] & MASK_CMD);
	//int subCmdId = -1;
	switch (cmdId){
		case POLL:
			cur_balance = read_balance();
			if (cur_balance > 0) {  // BEGIN SESSION
				//TODO: how we can send balance > 650RUB to VMC?
				cur_balance = cur_balance > MAX_AMOUNT_VALUE ? MAX_AMOUNT_VALUE : cur_balance;
				getBalanceArray(cur_balance, result);
				fill_mbd_command(&resp, result, 4);
				send_mdb_command(&resp);
				// safe to last_cmd
				fill_mbd_command(&last_cmd, result, 4);
				_cashless_state = ST_IDLE;
				log("(ENABLED)|RECV:POLL ; SEND: BEGIN SESSION");
			} else {
				// balance is not ready
				// Send ACK to VMC
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
			}
		break; 
	}
}

void process_session_idle(unsigned char* data){
	char resp_ack[1] = {0x00};
//	char resp_session_cancel[2] = {0x04,0x04};
//	char resp_end_session[2] = {0x07,0x07};
	int value = 0;
	int cmdId =    (int)(data[0] & MASK_CMD);
	int subCmdId = -1;
	switch (cmdId){
//		case ACK:
//			log("(IDLE)|RECV:ACK ; SEND: NOTHING");
//			break;
		case VEND:
			subCmdId = (int)data[1];
			switch(subCmdId) {
				case 0x00: // Vend Request
					item_price = ((value | (int)data[2]) << 8) | (int)data[3];  //item price SCALED!!!					
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					_cashless_state = ST_VEND; 
					log("(IDLE)|RECV:VEND ; SEND: ACK (Vend Request)");
				break;
				case 0x01: // Cancel Vend
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(IDLE)|RECV:VEND ; SEND: ACK (VEND DENIED)");
				break;
				case 0x04: // Session Complete
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(IDLE)|RECV:VEND ; SEND: ACK (SESSION COMPLETE)");
				break;
				// другие sub 
			}
		break;
		case POLL:
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
//			if (isSessionCanceled){
//				// send Session Cancel
//				fill_mbd_command(&resp, resp_session_cancel, 2);
//				send_mdb_command(&resp);
//				//lastCmd = [0x04, 0x04];
//				fill_mbd_command(&last_cmd, resp_session_cancel, 2);
//				log("(IDLE)|RECV:SESSION_CANCEL ; SEND: 0x04 (SESSION CANCEL)");
//				// Session Cancel => set to zero balance
//				balanceReady = 0x00; // false
//			} else {
//				// send End Session
//				fill_mbd_command(&resp, resp_end_session, 2);
//				send_mdb_command(&resp);
//				// lastCmd = [0x07, 0x07];
//				fill_mbd_command(&last_cmd, resp_end_session, 2);
//				_cashless_state = ST_ENABLED;
//				log("(IDLE)|RECV:POLL ; SEND: 0x07 (END SESSION)");
//				// end Session => set to zero balance
//				balanceReady = 0x00; // false
//			}
		break;
	}
}

void process_vend(unsigned char* data){
	char resp_ack[1] = {0x00};
	char chk;
	int cmdId =    (int)(data[0] & MASK_CMD);
	char commad_to_send[4] = {0,0,0,0};


	int subCmdId = -1;
	switch (cmdId){
		case ACK:
			log("(VEND)|RECV:ACK ; SEND: NOTHING");
			break;
		case POLL:
			// No CoinMechanismPushes No SessionFailure
			// VEND APPROVED
			cur_balance -= item_price;
			// не удается корректно разбить значение баланса
			commad_to_send[0] = 0x03;
			commad_to_send[1] = (char)(cur_balance >> 8);
			commad_to_send[2] = (char)(cur_balance & 0x00FF);
			chk = calculate_checksum(commad_to_send,4);                
			commad_to_send[3] = chk;
			/*
			printf("\n ------>>> ");
			for(i=0; i<4; i++){	
				printf("0x%02x",(unsigned char)commad_to_send[i]);
				printf(" ");
			}
			printf("\n");
			*/
			// send Vend Approved
			fill_mbd_command(&resp,commad_to_send,4);
			send_mdb_command(&resp);
			fill_mbd_command(&last_cmd,commad_to_send,4);
			log("(VEND)|RECV:POLL ; SEND: VEND APPROVED");
		break; 
		case VEND:
			subCmdId = (int)data[1];
			switch(subCmdId) {
				case 0x01: // CANCEL VEND
					fill_mbd_command(&resp,resp_ack,1);
					send_mdb_command(&resp);
					log("(VEND)|RECV:VEND ; SEND: ACK (CANCEL VEND)");			
				break;
				case 0x02: // VEND SUCCESS
					fill_mbd_command(&resp,resp_ack,1);
					send_mdb_command(&resp);
					_cashless_state = ST_IDLE;
					log("(ENABLED)|RECV:POLL ; SEND: ACK (VEND SUCCESS)");;
				break;
				case 0x03: // VEND FAILURE
					// flag: price is not returned
					fill_mbd_command(&resp,resp_ack,1);
					send_mdb_command(&resp);
					log("(VEND)|RECV:VEND ; SEND: ACK (VEND FAILURE)");
					//
					isRefundCompleted = 0x00; // false
					// refunding ...
					cur_balance += item_price;
					isRefundCompleted = 0x01; // true
				break;
				case 0x04: // SESSION COMPLETE
					fill_mbd_command(&resp,resp_ack,1);
					send_mdb_command(&resp);
					log("(VEND)|RECV:VEND ; SEND: ACK (SESSION COMPLETE)");
					isSessionComplete = 0x00; // true
				break;
			}
			// другие sub
		break;
	}
}

void process_message(unsigned char* data) {
	//int cmd = (int)(data[0] & MASK_CMD);
	switch(_cashless_state) {
		case ST_INACTIVE:
			process_inactive(data);
		break;
		case ST_DISABLED:
			process_disabled(data);
		break;
		case ST_ENABLED:
			process_enabled(data);
		break;
		case ST_IDLE:
			process_session_idle(data);
		break;
		case ST_VEND:
			process_vend(data);
		break;
	}
}
