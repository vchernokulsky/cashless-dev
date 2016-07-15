//#define __PC_STUB__

// Cashless Device states
#define ST_INACTIVE     0x01
#define ST_DISABLED     0x02
#define ST_ENABLED      0x03
#define ST_IDLE         0x04
#define ST_VEND         0x05
#define ST_REVALUE      0x06
#define ST_NEGVEND      0x07

#define MASK_CMD  0x07
#define MASK_ADDR 0xF8

// Cashless Device commands
#define RESET       0x00
#define SETUP       0x01
#define POLL        0x02
#define VEND        0x03
#define READER      0x04
#define REVALUE     0x05
#define EXPANSION   0x07

// Common commands
#define ACK         0x00
#define RET         0xAA
#define NAK         0xFF

#define MAX_MSG_LENGTH  36
