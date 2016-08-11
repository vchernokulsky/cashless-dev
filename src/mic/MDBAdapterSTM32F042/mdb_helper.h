// define MDB structures
#include "MDBConst.h"

struct Response {
	int  length;
	char buffer[MAX_MSG_LENGTH];
};

unsigned char calculate_checksum(const char* data, unsigned int length);

unsigned short check_for_mdb_command(char input);

void send_mdb_command(struct Response *data);

void fill_mbd_command(struct Response *resp, const char* buffer, int length);

void clear_mdb_command(struct Response *resp);

int read_balance();

#if defined(__PLATFORM_STM32__)
void CashlessProtocoInit(void (*writestream)(uint16_t Data ));
#endif

// espruino communication layer
void send_to_espruino(const char *cmd, unsigned int length);
