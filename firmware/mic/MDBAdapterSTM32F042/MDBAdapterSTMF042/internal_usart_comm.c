#include "internal_usart_comm.h"

#include <stdlib.h>
#include <string.h>

// STM32 specific includes
#if defined(__PLATFORM_STM32__)
	#include "board.h"
#endif
// PC specific includes
#if defined(__PLATFORM_PC__)
	#include <memory.h>
#endif


// internal functions
void send_to_espruino(const char *cmd, unsigned int length) {
#if defined(__PLATFORM_PC__)
	unsigned int i = 0;
	for(i=0; i<length; i++) {
		unsigned int val = (unsigned int)buffer[i];
		printf("0x%02x", val);
		printf(" ");
	}
	printf("\n");
#elif defined(__PLATFORM_STM32__)
	USART2_Send_String(cmd);
#endif
}


// external functions
unsigned short read_user_balance() {
	unsigned int balance = 0;
#if defined(__PLATFORM_PC__)
	balance = 30*100;  //always 30RUB per bottle
#elif defined(__PLATFORM_STM32__)
	balance = get_user_balance();
#endif
	if(balance < 100) {
		balance = 0;
	}
	else if (balance > 65000) {
		balance = 65000;
	}
	return balance;
}

void send_startup() {
	send_to_espruino("MDB BOARD STARTED\n", 18);
}

void send_disable() {
	send_to_espruino("DISABLE:\n", 9);
}

void send_enable() {
	send_to_espruino("ENABLE:\n", 8);
}

void send_session_cancel() {
	send_to_espruino("CANCEL:\n", 8);
}

void send_vend_info(unsigned short id, unsigned short price) {
	char str_item_id[6];
	char str_item_price[6];
	char str_espr_cmd[64];
	//initialize variables
	memset(str_item_id, 0x00, 6);
	memset(str_item_price, 0x00, 6);
	memset(str_espr_cmd, 0x00, 64);
	//prepare command text
	itoa(id, str_item_id);
	itoa(price, str_item_price);
	strcat(str_espr_cmd, "VEND:");
	strcat(str_espr_cmd, str_item_id);
	strcat(str_espr_cmd, ":");
	strcat(str_espr_cmd, str_item_price);
	strcat(str_espr_cmd, "\n");
	send_to_espruino(str_espr_cmd, strlen(str_espr_cmd));
}

void send_balance_echo(unsigned int balance) {
	char str_espr_cmd[64];
	memset(str_espr_cmd, 0x00, 64);
	itoa(balance, str_espr_cmd);
	strcat(str_espr_cmd, "\n");
	send_to_espruino(str_espr_cmd, strlen(str_espr_cmd));
}

void send_revalue_info(unsigned short amount) {
	char str_revalue_amount[6];
	char str_espr_cmd[64];
	memset(str_revalue_amount, 0x00, 6);
	memset(str_espr_cmd, 0x00, 6);
	itoa(amount, str_revalue_amount);
	strcat(str_espr_cmd, "REVALUE:");
	strcat(str_espr_cmd, str_revalue_amount);
	strcat(str_espr_cmd, "\n");
}
