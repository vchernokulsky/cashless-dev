// parser state definition
#define ST_UNDEFINED       0x00
#define ST_CMD_STARTED     0x01
#define ST_CMD_STOPPED     0x02
#define ST_ESC_SYMBOL      0x03

//
#define PACKAGE_PREAMBLE   0xFF
#define PACKAGE_POSTAMBLE  0xFE

// interprocess command definitions
#define CMD_SESSION_BEGIN  0x01
#define CMD_SESSION_END    0x02
#define CMD_SESSION_CANCEL 0x03

// result codes definitions
#define RESULT_OK             0
#define RESULT_CMD_NOT_FOUND  1
#define RESULT_INCORRECT_CRC  2


// internal communication structures
struct Command {
	unsigned short cmd_id;
	char data[128];
	char crc[2];
};

// special command types
#pragma pack(push, 1)
struct BeginSession {
	unsigned short cmd_id;
	unsigned short amount;
};
#pragma pack(pop)

struct EndSession {
	unsigned short cmd_id;
};

struct CancelSession {
	unsigned short cmd_id;
};

// external interface
void read_command(unsigned char* buffer, unsigned short buffer_length, unsigned short start_idx, 
					unsigned short *result_code, struct Command *command);

void parse_command(struct Command *cmd, void *result);