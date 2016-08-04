
void initialize_board();

void delay_ms(uint32_t ms);

void USART1_Send(unsigned short data);

unsigned short USART1_Recv();

void itoa1(unsigned int binval);

void USART2_Send_String(char* str);

int read_balance();
