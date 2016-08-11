#include "platform.h"

#include <stdio.h>
#include <string.h>

#include "MDBConst.h"
#include "mdb_helper.h"
#include "cashless_protocol.h"
#include "logger.h"

#if defined(__PLATFORM_STM32__)
	#include "board.h"
#endif

// declare specific constants
unsigned short MAX_AMOUNT_VALUE = 65000;

// internal flags
unsigned short isBalanceReady    = 0x00; // false
unsigned short isSessionCanceled = 0x00; // false
unsigned short isRefundCompleted = 0x00; // false
unsigned short isSessionComplete = 0x00; // false

// VENDING result variable
unsigned short vend_result_variable = VEND_NOTHING;

// for success single vend scenario
char str_item_price[16];
char str_espr_cmd[23];
unsigned int item_price  = 0;
unsigned int cur_balance = 0;


// cashless FSM states
unsigned int  _cashless_state = ST_INACTIVE;
unsigned int  _delay_state;
// variables for store MDB response
struct Response delay_cmd;
struct Response last_cmd;
struct Response resp;


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
			log("(INACTIVE)|RECV:RESET; SEND: ACK; DELAY: JUST RESET\n");
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
					log("(INACTIVE)|RECV:SETUP [config data] ; SEND: ACK; DELAY: CONFIG DATA\n");
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
					log("(INACTIVE)|RECV:EXPANSION [request id]; SEND: ACK; DELAY: DEV ID\n");
				break;
			}
		break;
		default:
			log("(INACTIVE)|UNKNOWN COMMAND\n");
	}
}

void process_disabled(unsigned char* data){
	char resp_ack[1] = {0x00};
	char resp_just_reset[2] = {0x00, 0x00};
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
			// make delay_cmd: resp_just_reset
			fill_mbd_command(&delay_cmd, resp_just_reset, 2);
			log("(DISABLED)|RECV:RESET; SEND: ACK; DELAY: JUST RESET\n");
		break;
		case POLL:
			// process RESET command
			if (delay_cmd.length>0){
				send_mdb_command(&delay_cmd);
				clear_mdb_command(&delay_cmd);
				log("(DISABLED)|RECV:POLL; SEND: delay_cmd\n");
			} else {
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(DISABLED)|RECV:POLL; SEND: ACK\n");
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
					send_to_espruino("PWRUP\n", 6);
					//log("(DISABLED)|RECV:READER [reader enable]; SEND: Reader Enable\n");
				break;
				case 0x00: // Reader Disable
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(DISABLED)|RECV:READER [reader disable]; SEND: ACK\n");
				break;
				case 0x02: // Reader Cancel
					fill_mbd_command(&delay_cmd,resp_cmd_out_of_sequence, 2);
				break;
			}
		break;
		case EXPANSION:
			if (subCmdId == 0x00) { // EXPANSION ID REQUEST 
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(DISABLED)|RECV:EXPANSION [id request]; SEND: ACK\n");
				fill_mbd_command(&delay_cmd, pesn_expansion_id_request, 4);
			}
		break;
		default:
			log("(DISABLED)|UNKNOWN COMMAND\n");
	}
}

void process_enabled(unsigned char* data){
	char resp_ack[1] = {0x00};
	char resp_just_reset[2] = {0x00, 0x00};
	char resp_display[34] = {0x02, 100, 0x2E,0x36,0x39,0x3D,0x42,0x14,0x3C,0x35,0x38,0x3D,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14,0x14};
	char result[4] = {0,0,0,0};

	int cmdId =    (int)(data[0] & MASK_CMD);
	int subCmdId = 0xFF;
	switch (cmdId){
		case RESET:
			fill_mbd_command(&resp, resp_ack, 1);
			send_mdb_command(&resp);
			fill_mbd_command(&delay_cmd, resp_just_reset, 2);
			// change state to INACTIVE
			_cashless_state = ST_INACTIVE;
			log("(ENABLED)|RECV:RESET ; SEND: ACK\n");
			break;
		case POLL:
			cur_balance = read_balance();
			if (cur_balance > 0) {  // BEGIN SESSION
				//switch on session indicator
				//set_led_state(0x01);
				//TODO: how we can send balance > 650RUB to VMC?
				cur_balance = cur_balance > MAX_AMOUNT_VALUE ? MAX_AMOUNT_VALUE : cur_balance;
				getBalanceArray(cur_balance, result);
				fill_mbd_command(&resp, result, 4);
				send_mdb_command(&resp);
				// safe to last_cmd
				vend_result_variable = VEND_NOTHING;
				fill_mbd_command(&last_cmd, result, 4);
				_cashless_state = ST_IDLE;
				log("(ENABLED)|RECV:POLL ; SEND: BEGIN SESSION\n");
			} else {
				// balance is not ready
				// Send ACK to VMC
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(ENABLED)|RECV:POLL ; SEND: ACK\n");
			}
		break;
		case READER:
			subCmdId = data[1];
			switch(subCmdId) {
			case 0x00: //reader disable
				fill_mbd_command(&delay_cmd, resp_display, 34);
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(ENABLED)|RECV:READER[READER DISABLE]; SEND: ACK\n");
				break;
			case 0x01: // reader enable
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
				log("(ENABLED)|RECV:READER[READER ENABLE]; SEND: ACK\n");
				break;
			case 0x02: // reader cancel
				// TODO: send 0x08 - canceled
				log("(ENABLED)|RECV:READER[READER CANCEL]; SEND: ACK\n");
				break;
			}
			break;
		default:
			log("(ENABLED)|UNKNOWN COMMAND\n");
	}
}

void process_session_idle(unsigned char* data){
	char resp_ack[1] = {0x00};
	char resp_just_reset[2] = {0x00, 0x00};
	char resp_session_cancel[2] = {0x04,0x04};
	char resp_end_session[2] = {0x07,0x07};

	int value = 0;
	int cmdId =    (int)(data[0] & MASK_CMD);
	int subCmdId = -1;
	switch (cmdId){
		case RESET:
			fill_mbd_command(&resp, resp_ack, 1);
			send_mdb_command(&resp);
			fill_mbd_command(&delay_cmd, resp_just_reset, 2);
			// change state to INACTIVE
			_cashless_state = ST_INACTIVE;
			log("(IDLE)|RECV:RESET ; SEND: ACK\n");
			break;
		case VEND:
			subCmdId = (int)data[1];
			switch(subCmdId) {
				case 0x00: // Vend Request
					item_price = ((value | (int)data[2]) << 8) | (int)data[3];  //item price SCALED!!!
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					_cashless_state = ST_VEND; 
					log("(IDLE)|RECV:VEND[Vend Request] ; SEND: ACK\n");
				break;
				case 0x01: // Cancel Vend
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(IDLE)|RECV:VEND[Vend Denied] ; SEND: ACK\n");
				break;
				case 0x04: // Session Complete
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(IDLE)|RECV:VEND(Session Complete) ; SEND: ACK\n");
				break;
				default:
					log("(IDLE)|UNKNOWN SUBCOMMAND\n");
			}
		break;
		case POLL:
			switch(vend_result_variable) {
				case VEND_NOTHING:
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					log("(IDLE)|RECV:POLL; SEND: ACK\n");
					break;
				case VEND_CANCEL:
					// send Session Cancel
					fill_mbd_command(&resp, resp_session_cancel, 2);
					send_mdb_command(&resp);
					//lastCmd = [0x04, 0x04];
					fill_mbd_command(&last_cmd, resp_session_cancel, 2);
					log("(IDLE)|RECV:POLL; SEND: 0x04 (SESSION CANCEL)\n");
					// Session Cancel => set to zero balance
					isBalanceReady = 0x00; // false
					break;
				case VEND_SUCCESS:
					// send End Session
					fill_mbd_command(&resp, resp_end_session, 2);
					send_mdb_command(&resp);
					// lastCmd = [0x07, 0x07];
					fill_mbd_command(&last_cmd, resp_end_session, 2);
					_cashless_state = ST_ENABLED;

					memset(str_item_price, 0x00, 16);
					memset(str_espr_cmd, 0x00, 23);
					itoa(item_price, str_item_price);
					strcat(str_espr_cmd, "PRICE:");
					strcat(str_espr_cmd, str_item_price);
					strcat(str_espr_cmd, "\n");
					send_to_espruino(str_espr_cmd, strlen(str_espr_cmd));
					//switch off session indicator
					//set_led_state(0x00);
					// end Session => set to zero balance
					break;
			}
		break;
		default:
			log("(IDLE)|UNKNOWN COMMAND\n");
	}
}

void process_vend(unsigned char* data){
	char resp_ack[1] = {0x00};
	char resp_just_reset[2] = {0x00, 0x00};
	char chk;
	int cmdId =    (int)(data[0] & MASK_CMD);
	char commad_to_send[4] = {0, 0, 0, 0};

	int subCmdId = -1;
	switch (cmdId){
		case RESET:
			fill_mbd_command(&resp, resp_ack, 1);
			send_mdb_command(&resp);
			fill_mbd_command(&delay_cmd, resp_just_reset, 2);
			// change state to INACTIVE
			_cashless_state = ST_INACTIVE;
			log("(VEND)|RECV:RESET ; SEND: ACK\n");
			break;
		case POLL:
			// No CoinMechanismPushes No SessionFailure
			// VEND APPROVED
			cur_balance -= item_price;
			commad_to_send[0] = 0x05;
			commad_to_send[1] = (char)(cur_balance >> 8);
			commad_to_send[2] = (char)(cur_balance & 0x00FF);
			chk = calculate_checksum(commad_to_send, 4);
			commad_to_send[3] = chk;

			// send Vend Approved
			fill_mbd_command(&resp, commad_to_send, 4);
			send_mdb_command(&resp);
			log("(VEND)|RECV:POLL; SEND: VEND APPROVED\n");
		break; 
		case VEND:
			subCmdId = (int)data[1];
			switch(subCmdId) {
				case 0x01: // CANCEL VEND
					fill_mbd_command(&resp,resp_ack, 1);
					send_mdb_command(&resp);
					vend_result_variable = VEND_CANCEL;
					log("(VEND)|RECV:VEND[CANCEL]; SEND:ACK\n");
				break;
				case 0x02: // VEND SUCCESS
					fill_mbd_command(&resp,resp_ack, 1);
					send_mdb_command(&resp);
					_cashless_state = ST_IDLE;
					vend_result_variable = VEND_SUCCESS;
					log("(VEND)|RECV:VEND[SUCCESS]; SEND: ACK\n");;
				break;
				case 0x03: // VEND FAILURE
					// flag: price is not returned
					fill_mbd_command(&resp,resp_ack,1);
					send_mdb_command(&resp);
					vend_result_variable = VEND_FAILURE;
					log("(VEND)|RECV:VEND[FAILURE]; SEND: ACK\n");
					//
					isRefundCompleted = 0x00; // false
					// refunding ...
					cur_balance += item_price;
					isRefundCompleted = 0x01; // true
				break;
				// process in failure scenario
				case 0x04: // SESSION COMPLETE
					fill_mbd_command(&resp, resp_ack, 1);
					send_mdb_command(&resp);
					_cashless_state = ST_IDLE;
					//TODO: this response is not as MDB protocol
					vend_result_variable = VEND_SUCCESS;
					log("(VEND)|RECV:VEND[SESSION COMPLETE]; SEND: ACK\n");
				break;
				default:
					log("(VEND)|UNKNOWN SUBCOMMAND\n");

			}
		break;
		default:
			log("(VEND)|UNKNOWN COMMAND\n");
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
