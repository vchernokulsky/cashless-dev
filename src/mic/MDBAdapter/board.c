#include "stm32f0xx.h"
#include "system_stm32f0xx.h"
#include "stm32f0xx_conf.h"
#include "stm32f0xx_it.h"

////////////////////////////////////////////
// declare pripherial structures
GPIO_InitTypeDef  GPIOInitStructl;
USART_InitTypeDef USART_InitStructure;
SPI_InitTypeDef   SPI_InitStruct;
GPIO_TypeDef      GPType;

////////////////////////////////////////////
// function forward declarations

// USART specific functions
//void USART_pinout_config(void);
void USARTInit(void);
void DMA_USARTInit(void);
//void USART1_IRQHandler(void);
void USARTSend(uint16_t);

//SPI specific functions
//void SPI_pinout_config(void);
void SPIInit(void);
int  SPIRead(uint8_t addr, uint8_t* buffer, int len);
int  SPIWrite(uint8_t addr, uint8_t* buffer, int len);
void SPICSOn(void);
void SPICSOff(void);
//void SPI_Write_Reg(unsigned char reg, unsigned char value);
//unsigned char SPI_Read_Reg(unsigned char reg);



// public interface for use in main logic
void initialize_board() {
	SystemInit();
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);


//	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_DMA1,ENABLE);
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1,ENABLE);
	USARTInit();
	USART_Cmd(USART1,ENABLE);
	char byte = 0;

//	DMA_USARTInit();
//	USARTInit();
//	USART_DMACmd(USART1,USART_DMAReq_Tx,ENABLE);
//	USART_DMACmd(USART1,USART_DMAReq_Rx,ENABLE);
//	DMA_Cmd(DMA1_Channel2,ENABLE);
//	DMA_Cmd(DMA1_Channel3,ENABLE);
//	USART_Cmd(USART1,ENABLE);

}
////////////////////////////////////////////////////////////////////////
// concrete peripherial initialization
// this functions must be encapsulated in this source file

// USART functions implementation
void USARTInit(void) {
    GPIO_InitTypeDef GPIO_InitStructure;
    USART_InitTypeDef USART_InitStructure;

    /* USARTx configured as follow:
    - BaudRate = 115200 baud
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
//    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_2 | GPIO_Pin_3;
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_9 | GPIO_Pin_10; // For STM32 devboard
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_NOPULL;
    GPIO_Init(GPIOA, &GPIO_InitStructure);

    /* Connect PXx to USARTx_Tx */
//    GPIO_PinAFConfig(GPIOA, GPIO_PinSource2, GPIO_AF_1);
    GPIO_PinAFConfig(GPIOA, GPIO_PinSource9, GPIO_AF_1);

    /* Connect PXx to USARTx_Rx */
//    GPIO_PinAFConfig(GPIOA, GPIO_PinSource3, GPIO_AF_1);
    GPIO_PinAFConfig(GPIOA, GPIO_PinSource10, GPIO_AF_1);

    /* USART configuration */
    USART_Init(USART1, &USART_InitStructure);
}

void DMA_USARTInit(void) {
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_DMA1,ENABLE);

	// Tx over DMA init
	DMA_InitTypeDef dma;
	DMA_StructInit(&dma);
	dma.DMA_PeripheralBaseAddr = (uint32_t)&(USART1->TDR);
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
	DMA_Init(DMA1_Channel2,&dma);

	// Rx over DMA init
	DMA_StructInit(&dma);
	dma.DMA_PeripheralBaseAddr = (uint32_t)&(USART1->RDR);
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
	DMA_Init(DMA1_Channel3,&dma);
}

void USARTSend(uint16_t data) {
	USART_SendData(USART1, data);
	while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET)
	{}
}

void USARTRead() {
}

// SPI functions implementation
void SPIInit(void) {
	SPI_Cmd(SPI1,DISABLE);
	SPI_I2S_DeInit(SPI1);

	GPIO_InitTypeDef GPIO_InitStruct;


	/** SPI1 GPIO Configuration
				 PA4	 ------> SPI1_NSS
				 PA5	 ------> SPI1_SCK
				 PA6	 ------> SPI1_MISO
				 PA7	 ------> SPI1_MOSI
	 */


	/*Enable or disable the AHB peripheral clock */
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);

	/*Configure GPIO pin */
	GPIO_InitStruct.GPIO_Pin = GPIO_Pin_4;
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_OUT;
	GPIO_InitStruct.GPIO_OType = GPIO_OType_PP;
	GPIO_InitStruct.GPIO_PuPd = GPIO_PuPd_NOPULL;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_10MHz;
	GPIO_Init(GPIOA, &GPIO_InitStruct);

	/*Configure GPIO pin */
	GPIO_InitStruct.GPIO_Pin = GPIO_Pin_5|GPIO_Pin_7;
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_AF;
	GPIO_InitStruct.GPIO_OType = GPIO_OType_PP;
	GPIO_InitStruct.GPIO_PuPd = GPIO_PuPd_DOWN;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_10MHz;
	GPIO_Init(GPIOA, &GPIO_InitStruct);

	/*Configure GPIO pin */
	GPIO_InitStruct.GPIO_Pin = GPIO_Pin_6;
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_AF;
	GPIO_InitStruct.GPIO_OType = GPIO_OType_PP;
	GPIO_InitStruct.GPIO_PuPd = GPIO_PuPd_NOPULL;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_10MHz;
	GPIO_Init(GPIOA, &GPIO_InitStruct);

	/*Configure GPIO pin alternate function */
	//			GPIO_PinAFConfig(GPIOA, GPIO_PinSource4, GPIO_AF_0);

	/*Configure GPIO pin alternate function */
	GPIO_PinAFConfig(GPIOA, GPIO_PinSource5, GPIO_AF_0);

	/*Configure GPIO pin alternate function */
	GPIO_PinAFConfig(GPIOA, GPIO_PinSource6, GPIO_AF_0);

	/*Configure GPIO pin alternate function */
	GPIO_PinAFConfig(GPIOA, GPIO_PinSource7, GPIO_AF_0);

	RCC_APB2PeriphClockCmd(RCC_APB2Periph_SPI1,ENABLE);


	SPI_InitTypeDef spi;
	spi.SPI_CPOL = SPI_CPOL_Low;
	spi.SPI_CPHA = SPI_CPHA_1Edge;
	spi.SPI_DataSize = SPI_DataSize_8b;
	spi.SPI_Direction = SPI_Direction_2Lines_FullDuplex;
	spi.SPI_FirstBit = SPI_FirstBit_MSB;
	spi.SPI_Mode = SPI_Mode_Master;
	spi.SPI_NSS = SPI_NSS_Soft;
	spi.SPI_BaudRatePrescaler = SPI_BaudRatePrescaler_256;

	SPI_Init(SPI1,&spi);

	SPI_Cmd(SPI1,ENABLE);

	SPICSOff();

	}

void SPICSOn(void) {
	GPIO_ResetBits(GPIOA,GPIO_Pin_4);
	return;
	}

void SPICSOff(void) {
	GPIO_SetBits(GPIOA,GPIO_Pin_4);
	return;
}

int SPIRead(uint8_t addr, uint8_t* buffer, int len) {
	SPI_I2S_ReceiveData16(SPI1);

	uint8_t t = 0;
	uint8_t multi = RESET;
	uint16_t rxdata = 0;

	if(len <= 0)
	{
		return -1;
	}

	//		 It's a multiple read operation
	if(len > 1)
	{
		multi = SET;
		addr |= (1 << 6);
	}

	addr |= (1 << 7);

	SPICSOn();

	//		 Send address
	while(SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_BSY) == SET)
			;

	if(multi == RESET)
	{
		while(SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_TXE) == RESET)
			;

		SPI_I2S_SendData16(SPI1,addr);
		while(SPI_I2S_GetFlagStatus(SPI1,SPI_I2S_FLAG_BSY) == SET)
			;
		rxdata = SPI_I2S_ReceiveData16(SPI1);
		t = (uint8_t)(rxdata >> 8);
		*buffer++ = t;
	}
	else {

		while(SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_TXE) == RESET)
			;
		SPI_I2S_SendData16(SPI1,addr);
		while(SPI_I2S_GetFlagStatus(SPI1,SPI_I2S_FLAG_BSY) == SET)
			;
		rxdata = SPI_I2S_ReceiveData16(SPI1);
		t = (uint8_t)((rxdata & 0xFF00) >> 8);
		*buffer++ = t;
		len--;
		while(len-- > 0 ){
			while(SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_TXE) == RESET)
				;

			SPI_I2S_SendData16(SPI1,0);
			while(SPI_I2S_GetFlagStatus(SPI1,SPI_I2S_FLAG_BSY) == SET)
				;
			rxdata = SPI_I2S_ReceiveData16(SPI1);


			t = (uint8_t)(rxdata);
			*buffer++ = t;
			if (len > 0) {
				t = (uint8_t)((rxdata & 0xFF00) >> 8);
				*buffer++ = t;
				len--;
			}
		}
	}

	SPICSOff();
	return 0 ;
}

int SPIWrite(uint8_t addr, uint8_t* buffer, int len) {
	if(len <= 0)
	{
		return -1;
	}

	//		 It's a multiple write operation
	if(len > 1)
	{
		addr |= (1 << 6);
	}

	//		 Transmission start: pull CS low

	SPICSOn();

	while(SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_TXE) == RESET)
				;

	//		 Send address
	SPI_SendData8(SPI1,addr);
	while(SPI_I2S_GetFlagStatus(SPI1,SPI_I2S_FLAG_BSY) == SET)
		;

	//		 Send data
	while(len--){
		while(SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_TXE) == RESET){}
		SPI_SendData8(SPI1, *buffer++);

		while(SPI_I2S_GetFlagStatus(SPI1,SPI_I2S_FLAG_BSY) == SET)
			;
	}
	SPICSOff();
	return 0 ;
}
