
void initialize_board();

void delay_ms(uint32_t ms);

void USART1_Send(unsigned short data);

unsigned short USART1_Recv();

void USART2_Send_String(const char *str);

void set_led_state(unsigned int state);

void itoa1(unsigned int binval);

void itoa(int n, char *s);

int get_user_balance();

int get_espruino_started();


