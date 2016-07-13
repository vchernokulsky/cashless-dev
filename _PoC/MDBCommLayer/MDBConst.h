// Cashless Device states
#define INACTIVE     0x01
#define DISABLED     0x02
#define ENABLED      0x03
#define SESSION_IDLE 0x04
#define STATE_VEND   0x05
#define REVALUE      0x06
#define NEGVEND      0x07

#define MASK_CMD  0x07
#define MASK_ADDR 0xF8

// Cashless Device commands
#define RESET       0x00
#define SETUP       0x01
#define POLL        0x02
#define VEND    0x03
#define READER      0x04
#define REVALUE     0x05
#define EXPANSION   0x07

// Common commands
#define ACK         0x00
#define RET         0xAA
#define NAK         0xFF