/** @file lis3dh.c
 * @author david.siorpaes@st.com
 * LIS3DH accelerometer device driver. Uses SPI2 interface.
 * See spiConfig() documentation for port pin configuration. 
 */
 

#include "lis3dh.h"
#include "lis3dh_reg.h"

int (*LIS3DHStreamWrite)(uint8_t addr, uint8_t* buffer, int len);
int (*LIS3DHStreamRead)(uint8_t addr, uint8_t* buffer, int len);

enum Ascale AFS = AFS_2G;     // AFS_2G, AFS_4G, AFS_8G, AFS_16G

/** @defgroup LIS3DH device driver public APIs
 * @{
 */
 
 
 /** @brief Initializes LIS3DH device with following configuration:
  * 100Hz sampling rate
  * Enable all axis
	* @retval None
  */
void lis3dhConfig(int (*writefunction)(uint8_t addr, uint8_t* buffer, int len),
		int (*readfunction)(uint8_t addr, uint8_t* buffer, int len))
{
	LIS3DHStreamWrite = writefunction;
	LIS3DHStreamRead = readfunction;
	uint8_t val = 0;
	
	/* Configure SPI pins and port */
	/* Configure LIS3DH device: enable X, Y, Z axis, se 100Hz sampling rate */
	val = CTRL_REG1_XEN | CTRL_REG1_YEN | CTRL_REG1_ZEN | CTRL_REG1_ODR_100;
	LIS3DHStreamWrite((uint8_t)CTRL_REG1, &val, 1);
}

int lis3dhWhoAm(void)
{
	uint8_t buff[2];
	LIS3DHStreamRead(WHO_AM_I,buff,1);
	if(buff[0]==WHO_AM_I_VALUE)
	{
		return 0 ;
	}else
	{
		return -1;
	}
}


uint8_t lis3dhGetStatus()
{
	uint8_t buff[2];
	LIS3DHStreamRead(STATUS_REG2,buff,1);
	return buff[0];
	}


/** @brief Returns current acceleration value
 * @param x: pointer where to store X acceleration value
 * @param y: pointer where to store Y acceleration value
 * @param z: pointer where to store Z acceleration value
 * @retval always 0
 */
int lis3dhGetAcc(int16_t* x, int16_t* y, int16_t* z)
{
	uint8_t buffer[6];
	int16_t ax = 0;
	int16_t ay = 0;
	int16_t az = 0;
	
	/* Read out all 6 bytes in one shot */
	LIS3DHStreamRead(OUT_X_L, buffer, 6);

	ax = ((buffer[1]) << 8);
	ax |= buffer[0];
	
	ay = (buffer[3]) << 8;
	ay |= buffer[2];

	az = (buffer[5]) << 8;
	az |= buffer[4];

	*x = ax;
	*y = ay;
	*z = az;

	return 0;
}




/** @brief Set accelerometer range
 * @param range: range to be set. Can be one out of
 *               RANGE_2G, RANGE_4G, RANGE_8G, RANGE_16G
 */
void lis3dhSetRange(int8_t range)
{
	uint8_t regval;
	
	assert_param(range == RANGE_2G || range == RANGE_4G || range == RANGE_8G || range == RANGE_16G);
	
	regval = LIS3DHStreamRead(CTRL_REG4, &regval, 1);
	regval &= ~(3 << 4);
	regval |= range;
	LIS3DHStreamWrite(CTRL_REG4, &regval, 1);
}



/** @brief Writes given amount of data to sensor
 * @param addr: Register address to write to
 * @param buffer: Source buffer
 * @param len: Number of bytes to be written
 * @retval Zero on success, -1 otherwise
 */
/*int spiWrite(uint8_t addr, uint8_t* buffer, int len)
{	
	if(len <= 0)
		return -1;
	
	 It's a multiple read operation
	if(len > 1)
		addr |= SPI_MULTI_ACCESS;
	
	 Transmission start: pull CS low
	csOn();
	
	 Send address
	while(SPI_GetFlagStatus(SPI2, SPI_FLAG_TXE) == RESET){}
	SPI_SendData(SPI2, addr);
	
	 Wait data hits slave
	while(SPI_GetFlagStatus(SPI2, SPI_FLAG_RXNE) == RESET);
	SPI_ReceiveData(SPI2);
		
	 Send data
	while(len--){
		while(SPI_GetFlagStatus(SPI2, SPI_FLAG_TXE) == RESET){}
		SPI_SendData(SPI2, *buffer++);
			
		while(SPI_GetFlagStatus(SPI2, SPI_FLAG_RXNE) == RESET);
		SPI_ReceiveData(SPI2);
	}

	 Transmission end: pull CS high
	csOff();
	
	return 0;
}*/

/**
 * @}
 */

float lis3dhGetAres() {
	float Res = 0.0f;
	switch (AFS)
	{
	// Possible accelerometer scales (and their register bit settings) are:
	// 2 Gs (00), 4 Gs (01), 8 Gs (10), and 16 Gs  (11).
	// Here's a bit of an algorith to calculate DPS/(ADC tick) based on that 2-bit value:
	case AFS_2G:
		Res = 2.0/32768.0;
		break;
	case AFS_4G:
		Res = 4.0/32768.0;
		break;
	case AFS_8G:
		Res = 8.0/32768.0;
		break;
	case AFS_16G:
		Res = 16.0/32768.0;
		break;
	}
	return Res;
}

void lis3dhSetAFS(enum Ascale afs)
{
	if(afs >= 2 && afs <= 16)
	{
		switch (afs)
		{
		case 2:
			AFS = AFS_2G;
			break;
		case 4:
			AFS = AFS_4G;
			break;
		case 8:
			AFS = AFS_8G;
			break;
		case 16:
			AFS = AFS_16G;
			break;
		}
	}
	return;
}

