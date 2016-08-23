#include "platform.h"

// read from espruino functions
unsigned short read_user_balance();

// send to espruino functions
void send_startup();
void send_enable();
void send_disable();
void send_session_cancel();
void send_vend_info(unsigned short id, unsigned short price);
