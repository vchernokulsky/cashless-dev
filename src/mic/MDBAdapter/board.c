#include <stdlib.h>
#include <string.h>

#include "stm32f0xx.h"
#include "system_stm32f0xx.h"
#include "stm32f0xx_conf.h"
#include "stm32f0xx_it.h"

#define DMA_USART2_Tx_Channel	DMA1_Channel4
#define DMA_USART2_Rx_Channel	DMA1_Channel5

#define TX_BUFF_LENGH	128
#define RX_BUFF_LENGH	128

////////////////////////////////////////////
// declare peripheral structures
GPIO_InitTypeDef  GPIOInitStructl;
USART_InitTypeDef USART_InitStructure;
SPI_InitTypeDef   SPI_InitStruct;
GPIO_TypeDef      GPType;

// declare variables for transport layers
volatile uint8_t txbuf[TX_BUFF_LENGH];
volatile uint8_t rx_buf[RX_BUFF_LENGH];
volatile char asc[5];


////////////////////////////////////////////
// function forward declarations

// USART specific functions
//void USART_pinout_config(void);
void USART1_Init(void);
unsigned short USART1_Recv();
void USART1_Send(uint16_t);

void USART2_Init(void);
unsigned short USART2_Recv();
void USART2_Send(uint16_t);
void USART2_DMA_Init(void);
void USART2_Send_String(char* str);


// public interface for use in main logic
void initialize_board() {
	SystemInit();
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);

	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_DMA1,ENABLE);
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1,ENABLE);

	USART_DeInit(USART1);
	USART_DeInit(USART2);
	DMA_DeInit(DMA_USART2_Rx_Channel);
	DMA_DeInit(DMA_USART2_Tx_Channel);

	USART1_Init();

	USART2_Init();
	USART2_DMA_Init();
	return;
}
////////////////////////////////////////////////////////////////////////
// concrete peripherial initialization
// this functions must be encapsulated in this source file

// USART functions implementation
void USART1_Init(void) {
	GPIO_InitTypeDef GPIO_InitStructure;
	USART_InitTypeDef USART_InitStructure;

	USART_DeInit(USART1);

	/* USARTx configured as follow:
    - BaudRate = 9600 baud
    - Word Length = 8 Bits
    - One Stop Bit
    - No parity
    - Hardware flow control disabled (RTS and CTS signals)
    - Receive and transmit enabled
	 */
	USART_InitStructure.USART_BaudRate = 9600;
	USART_InitStructure.USART_WordLength = USART_WordLength_9b;
	USART_InitStructure.USART_StopBits = USART_StopBits_1;
	USART_InitStructure.USART_Parity = USART_Parity_No;
	USART_InitStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
	USART_InitStructure.USART_Mode = USART_Mode_Rx | USART_Mode_Tx;

	/* Enable GPIO clock */
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);

	/* Enable USART clock */
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1, ENABLE);


	/* Configure USART Tx, Rx as alternate function push-pull */
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_9 | GPIO_Pin_10; // For STM32 devboard
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
	GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_NOPULL;
	GPIO_Init(GPIOA, &GPIO_InitStructure);

	/* Connect PXx to USARTx_Tx */
	GPIO_PinAFConfig(GPIOA, GPIO_PinSource9, GPIO_AF_1);

	/* Connect PXx to USARTx_Rx */
	GPIO_PinAFConfig(GPIOA, GPIO_PinSource10, GPIO_AF_1);

	/* USART configuration */
	USART_Init(USART1, &USART_InitStructure);
	USART_Cmd(USART1,ENABLE);
}

void USART1_Send(unsigned short data) {

	USART_SendData(USART1, (uint16_t)data);
	while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET)
	{}
	return;
}

unsigned short USART1_Recv() {
	while(USART_GetFlagStatus(USART1, USART_FLAG_RXNE) == RESET)
	{}

	uint16_t tbyte = USART_ReceiveData(USART1);
	return (unsigned short)tbyte;
}



void USART2_Init(void)
{
	GPIO_InitTypeDef GPIO_InitStructure;
	USART_InitTypeDef USART_InitStructure;

	USART_DeInit(USART2);
	/* USARTx configured as follow:
	    - BaudRate = 115200 baud
	    - Word Length = 8 Bits
	    - One Stop Bit
	    - No parity
	    - Hardware flow control disabled (RTS and CTS signals)
	    - Receive and transmit enabled
	 */
	USART_InitStructure.USART_BaudRate = 115200;
	USART_InitStructure.USART_WordLength = USART_WordLength_8b;
	USART_InitStructure.USART_StopBits = USART_StopBits_1;
	USART_InitStructure.USART_Parity = USART_Parity_No;
	USART_InitStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
	USART_InitStructure.USART_Mode = USART_Mode_Rx | USART_Mode_Tx;

	/* Enable GPIO clock */
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);

	/* Enable USART clock */
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_USART2, ENABLE);


	/* Configure USART Tx, Rx as alternate function push-pull */
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_2 | GPIO_Pin_3;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
	GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_NOPULL;
	GPIO_Init(GPIOA, &GPIO_InitStructure);

	/* Connect PXx to USARTx_Tx */
	GPIO_PinAFConfig(GPIOA, GPIO_PinSource2, GPIO_AF_1);

	/* Connect PXx to USARTx_Rx */
	GPIO_PinAFConfig(GPIOA, GPIO_PinSource3, GPIO_AF_1);

	/* USART configuration */
	USART_Init(USART2, &USART_InitStructure);
	USART_Cmd(USART2,ENABLE);
}


unsigned short USART2_Recv()
{
	while(USART_GetFlagStatus(USART2, USART_FLAG_RXNE) == RESET)
	{}

	uint16_t tbyte = USART_ReceiveData(USART2);
	return (unsigned short)tbyte;
}

void USART2_Send(uint16_t data)
{
	USART_SendData(USART2, (uint16_t)data);
	while (USART_GetFlagStatus(USART2, USART_FLAG_TXE) == RESET)
	{}

	return;
}

void USART2_Send_String(char* str)
{
//	while(!(USART1->SR & USART_SR_TC)); //Проверяем установку флага TC - завершения предыдущей передачи
//	TODO:Check the end of transmition
//	while(USART_GetFlagStatus(USART1,USART_FLAG_TC) == RESET);

	DMA_Cmd(DMA_USART2_Tx_Channel,DISABLE);
	memset((void*)txbuf, 0, TX_BUFF_LENGH);
	strcat((char*)txbuf, str);
	DMA_SetCurrDataCounter(DMA_USART2_Tx_Channel, strlen((void*)txbuf));
	DMA_Cmd(DMA_USART2_Tx_Channel,ENABLE);
	return;
	}


void USART2_DMA_Init(void) {
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_DMA1,ENABLE);

	// Tx over DMA init
	DMA_InitTypeDef dma;
	DMA_StructInit(&dma);
	dma.DMA_PeripheralBaseAddr = (uint32_t)&(USART2->TDR);
	dma.DMA_MemoryBaseAddr = (uint32_t)txbuf;
	dma.DMA_PeripheralDataSize = DMA_PeripheralDataSize_Byte;
	dma.DMA_MemoryDataSize = DMA_MemoryDataSize_Byte;
	dma.DMA_BufferSize = sizeof(txbuf);
	dma.DMA_DIR = DMA_DIR_PeripheralDST;
	dma.DMA_M2M = DMA_M2M_Disable;
	dma.DMA_MemoryInc = DMA_MemoryInc_Enable;
	dma.DMA_PeripheralInc = DMA_PeripheralInc_Disable;
	dma.DMA_Priority = DMA_Priority_Low;
	dma.DMA_Mode = DMA_Mode_Normal;
	DMA_Init(DMA_USART2_Tx_Channel,&dma);

	// Rx over DMA init
	DMA_StructInit(&dma);
	dma.DMA_PeripheralBaseAddr = (uint32_t)&(USART2->RDR);
	dma.DMA_MemoryBaseAddr = (uint32_t)rx_buf;
	dma.DMA_PeripheralDataSize = DMA_PeripheralDataSize_Byte;
	dma.DMA_MemoryDataSize = DMA_MemoryDataSize_Byte;
	dma.DMA_BufferSize = sizeof(rx_buf);
	dma.DMA_DIR = DMA_DIR_PeripheralSRC;
	dma.DMA_M2M = DMA_M2M_Disable;
	dma.DMA_MemoryInc = DMA_MemoryInc_Enable;
	dma.DMA_PeripheralInc = DMA_PeripheralInc_Disable;
	dma.DMA_Priority = DMA_Priority_Low;
	dma.DMA_Mode = DMA_Mode_Circular;
	DMA_Init(DMA_USART2_Rx_Channel,&dma);

	USART_DMACmd(USART2,USART_DMAReq_Tx,ENABLE);
	USART_DMACmd(USART2,USART_DMAReq_Rx,ENABLE);
	DMA_Cmd(DMA_USART2_Tx_Channel,ENABLE);
	DMA_Cmd(DMA_USART2_Rx_Channel,ENABLE);
}

int read_balance() {
	int i = 0;
	int val = 0;
	char sBalance[16];

	DMA_Cmd(DMA_USART2_Rx_Channel,DISABLE);
	memset(sBalance, 0x00, 16);
	for(i=0; i<16; i++) {
		if(txbuf[i] != '\n') {
			sBalance[i] = rx_buf[i];
			rx_buf[i] = 0x00;
		}
	}
	DMA_Cmd(DMA_USART2_Rx_Channel,ENABLE);
	val = atoi(sBalance);
	return val;
}

void delay_ms(uint32_t ms)
{
	volatile uint32_t nCount;
	RCC_ClocksTypeDef RCC_Clocks;
	RCC_GetClocksFreq (&RCC_Clocks);

	nCount=(RCC_Clocks.HCLK_Frequency/10000)*ms;
	for (; nCount!=0; nCount--);
}

void itoa1(unsigned int binval)
{
	register unsigned int temp,val;
	register char binc,atemp;

	val=binval;

	atemp='0'; temp=10000; while(val >= temp) {atemp++; val-=temp;};*(asc+0)=atemp;
	atemp='0'; temp=1000; while(val >= temp) {atemp++; val-=temp;};*(asc+1)=atemp;
	atemp='0'; temp=100; while(val >= temp) {atemp++; val-=temp;};*(asc+2)=atemp;
	atemp='0'; binc=(char)val; while(binc >= 10) {atemp++; binc-=10;};*(asc+3)=atemp;
	binc+='0';*(asc+4)=binc;
}

