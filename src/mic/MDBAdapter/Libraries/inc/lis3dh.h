/** @file lis3dh.h
 * @author david.siorpaes@st.com
 * Header file for LIS3DH driver. Includes both public and private APIs.
 */
 
#include <stdint.h>
#include "lis3dh_reg.h"

/* Range definitions. Map them to actual bitmasks. */
#define RANGE_2G   CTRL_REG4_FS2G
#define RANGE_4G   CTRL_REG4_FS4G
#define RANGE_8G   CTRL_REG4_FS8G
#define RANGE_16G  CTRL_REG4_FS16G


// Set initial input parameters
enum Ascale {
	AFS_2G = 0,
	AFS_4G,
	AFS_8G,
	AFS_16G
};



/* Public APIs */
void lis3dhConfig(int (*writefunction)(uint8_t addr, uint8_t* buffer, int len),
		int (*readfunction)(uint8_t addr, uint8_t* buffer, int len));
int lis3dhGetAcc(int16_t* x, int16_t* y, int16_t* z);
void lis3dhSetRange(int8_t range);
int lis3dhWhoAm(void);
uint8_t lis3dhGetStatus();
float lis3dhGetAres();
void lis3dhSetAFS(enum Ascale afs);
