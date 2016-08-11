#include "communication.h"

// 
unsigned char  _parser_state = ST_UNDEFINED;
unsigned char __esc_sym = 0x00;
unsigned short __command_length = 0;

// forward function definitions
void __put_cmd_byte(unsigned char byte, unsigned char *result);
unsigned short __calc_crc(unsigned char *buffer, unsigned short length);

unsigned char __command_buffer[128];

// external interface
void read_command(unsigned char* buffer, unsigned short buffer_length, unsigned short start_idx,
					unsigned short *result_code, struct Command *command) {
	unsigned char idx = 0;
	for(idx=start_idx; idx<buffer_length; idx++) {
		__put_cmd_byte(buffer[idx], __command_buffer);
	}
}

void parse_command(struct Command *cmd, void *result) {
	switch(cmd->cmd_id) {
		case CMD_SESSION_BEGIN: {
				struct BeginSession *tmp = ((struct BeginSession *)result);
				tmp->cmd_id = CMD_SESSION_BEGIN;
				tmp->amount = (cmd->data[1] << 8) | cmd->data[2];
			}
			break;
		default:
			break;
	}
}

// internal functions
void __put_cmd_byte(unsigned char byte, unsigned char *result) {
	unsigned char crc_msb = 0x00;
	unsigned char crc_lsb = 0x00;
	unsigned short cmd_crc = 0;
	unsigned short idx = 0;
	//
	switch(byte) {
		case PACKAGE_PREAMBLE:
			if(_parser_state == ST_CMD_STARTED) {
				__esc_sym = PACKAGE_PREAMBLE;
			}
			else {
				_parser_state = ST_CMD_STARTED;
			}
			break;
		case PACKAGE_POSTAMBLE:
			if(_parser_state == ST_CMD_STARTED) {
				_parser_state = ST_CMD_STOPPED; //end of command
				// command received to buffer
				crc_msb = __command_buffer[__command_length-2] << 8;
				crc_lsb = __command_buffer[__command_length-1];
				cmd_crc = crc_msb | crc_lsb;
				// check command correctness
				__calc_crc(__command_buffer, __command_length - 2);
			}
			break;
		default:
			if(__esc_sym) {
				//TODO: change to escaped symbol
				__esc_sym = 0x00;
			}
			else {
				__command_length++;
				idx = __command_length - 1;
				result[idx] = byte;
			}
			break;
	}
}

unsigned short __calc_crc(unsigned char *buffer, unsigned short length) {
	return 0x0000;
}