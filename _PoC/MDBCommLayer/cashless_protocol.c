#include "MDBConst.h"
#include "mdb_helper.h"
#include "logger.h"


// internal flags
unsigned short balanceReady = 0x00;
// cashless FSM states
unsigned int  _cashless_state = ST_INACTIVE;
unsigned int  _delay_state;
// variables for store MDB response
struct Response delay_cmd;
struct Response resp;


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

	int cmdId =    (int)data[0];
	int subCmdId = -1;
	switch (cmdId){
		case POLL: 
			if (!balanceReady){
				// balance is not ready
				// Send ACK to VMC
				fill_mbd_command(&resp, resp_ack, 1);
				send_mdb_command(&resp);
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
					send_mdb_command([_MDB.COMMON_MSG.ACK]);
					state = _MDB.CASHLESS_STATE.VEND; 
					//console.log('(IDLE)|RECV:VEND ; SEND: ACK (Vend Request)');
					debugger;
					*/
				break;
				case 0x04: // Session Complete
					/*
					send_mdb_command([_MDB.COMMON_MSG.ACK]);
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
			send_mdb_command([0x07, 0x07]);
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
			send_mdb_command([0x03, tmp[0], tmp[1], chk]);
			lastCmd = [0x03, tmp[0], tmp[1], chk];
			//console.log('(ENABLED)|RECV:POLL ; SEND: Vend Approved');
			*/
		break; 
		case VEND:
			subCmdId = (int)data[1];
			switch(subCmdId) {
				/*
				case 0x02: // VEND SUCCESS
				send_mdb_command([_MDB.COMMON_MSG.ACK]);
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