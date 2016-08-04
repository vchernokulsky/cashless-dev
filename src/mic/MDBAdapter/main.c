#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "board.h"

#include "MDBConst.h"
#include "mdb_helper.h"




void main(void)
{
	char mdb_cmd[36];
	unsigned short bytes_count = 0;
	unsigned short lenght = 0;
	unsigned char  isReadData = 0;
	// variables for reading from UART
	unsigned short tbyte = 0x0000;
	unsigned char  byte  = 0x00;
	initialize_board();

	send_to_espruino("BOARD STARTED\n", 14);

	// initialize cashless
	CashlessProtocoInit(USART1_Send);

	while(1)
	{
		tbyte = USART1_Recv();
		if(((tbyte & 0x0F00) != 0))
		{
			byte = (char)tbyte;
			isReadData = ((byte & MASK_ADDR) == 0x10);
		}
		if(isReadData) {
 			byte = (char)tbyte;
			mdb_cmd[bytes_count] = byte;
			bytes_count++;

			lenght = check_for_mdb_command(byte);
			if(lenght > 0) { //command read
				if(mdb_cmd[0] == 0x17) {
					byte = 0x00;
				}
				isReadData = 0x00;
				process_message(mdb_cmd);
				bytes_count = 0;
			}
		}
	}
}
