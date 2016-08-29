var balance = "";

var isEnabled = false;
var isVendDone = true;
//var isSessionTimeout = false;

// WIFI configuration
//var ssid = "neiron";
//var pass = "msp430f2013";

//var ssid = "service";
//var pass = "921249514821";

var ssid = "VendexFree";
var pass = "vendex2016";

// var ssid = "SauronAP";
// var pass = "yuwb3795";


var rfidIrqPin = P9; // P10
var mdbRstPin  = P0;  // P13
var ethIrqPin  = P1;
var wifiRstPin = A4;  //??

// ---------------------------------------------------------------
// -- begin variables for <cmd parser>
var PREAMBLE  = 0xFD;
var ESC       = 0xFF;
var POSTAMBLE = 0xFE;
// parser states 
var BEGIN_STATE  = 1;
var ESCSUM_STATE = 2;
var END_STATE    = 3;

// default parser state
var parser_state = BEGIN_STATE;

function logger(msg) {
    console.log(msg);
    //Serial2.write(msg + "\r\n");
}

// For GloLime server response
var buffer = new Array();

// For bytestuffing process
var EscSum = new Uint8Array([0xFF, 0xFE, 0xFD]);
// -- end variables for <cmd parser>

// -- begin variables for <GloLimeResponse>
var //addr,
	//frameId,
	//cmdCode,
	errorCode,
	//cmdData, // byte[] _cmdData
	crc16; // byte[] _cmdData
// -- end variables for <GloLimeResponse>

// Error Codes definitions for GloLime response
var ERROR_OK                = 0x00,
    ERROR_INVALID_CRC       = 0xFF,
    ERROR_INVALID_COMMAND   = 0xFE,
    ERROR_INVALID_PARAMETER = 0xFD;

var crcTable = [0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5,
0x60c6, 0x70e7, 0x8108, 0x9129, 0xa14a, 0xb16b,
0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c,
0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b,
0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738,
0xf7df, 0xe7fe, 0xd79d, 0xc7bc, 0x48c4, 0x58e5,
0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969,
0xa90a, 0xb92b, 0x5af5, 0x4ad4, 0x7ab7, 0x6a96,
0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03,
0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6,
0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb,
0xd10c, 0xc12d, 0xf14e, 0xe16f, 0x1080, 0x00a1,
0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c,
0xe37f, 0xf35e, 0x02b1, 0x1290, 0x22f3, 0x32d2,
0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447,
0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2,
0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827,
0x18c0, 0x08e1, 0x3882, 0x28a3, 0xcb7d, 0xdb5c,
0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0,
0x2ab3, 0x3a92, 0xfd2e, 0xed0f, 0xdd6c, 0xcd4d,
0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba,
0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
0x2e93, 0x3eb2, 0x0ed1, 0x1ef0];

// Frame ID
var frameId = 0x00;

// for CRC16_X25 calculation
var initialValue = 0xffff;
var castMask     = 0xFFFF;
var width        = 16;
var finalXorVal  = 0xFFFF;

// HEX user's UID for Request to GloLime
var uidToSend; 

var gloLimeResponse = [];

// For communications
var client, wifi;

// userId from GloLime resp (DEC)
var userId;
// userId in LittleEndian format
var userIdLittleEndian;
var userType;

// ID product to buy (get from MDB device)
var productId;

// For setting communication
var isRespGot = false;
var isRFIDOk  = false;
var isWiFiOk  = false;

// For setInterval to check WiFi and RFID/NFC
var idWiFi, idRFID;
// ---------------------------------------------------------------



function uintToByteArray(/*long*/long) {
    // we want to represent the input as a 8-bytes array
    var byteArray = [0, 0, 0, 0];
    for ( var index = 0; index < byteArray.length; index ++ ) {
        var byte = long & 0xff;
        byteArray [ index ] = byte;
        long = (long - byte) / 256 ;
    }

    return byteArray;
}

var PREFIX_LEN = 5;
function processTransportLayerCmd(cmd) {
    //var prefix = cmd.substr(0, PREFIX_LEN);
    var array = cmd.split(':');
    var prefix = array[0];
    switch(prefix) {
      case 'ENABLE':          //ENABLE:\n
        isEnabled = true;
        isVendDone = true;
        logger('ENABLE recieved');
        //LED notification
        LED1.set();
        setTimeout(function(){LED1.reset();}, 3000);
        break;
      case 'DISABLE':       //DISABLE:\n  
        isEnabled = false;
        logger('DISABLE received');
        break;
      case 'VEND':          //VEND:<PRODUCT ID>:<PRODUCT PRICE>\n
        str_product_id = array[1];
        str_product_price = array[2];
        //send balance to SportLife server
        isVendDone = true;
        //isSessionTimeout = false;
        //LED1.reset();
        logger('VEND INFO | PRODUCT ID: ' + str_product_id + '   PRODUCT PRICE: ' + parseInt(str_product_price, 10)/100);
        product_id = uintToByteArray(parseInt(str_product_id)+1);
        product_price = uintToByteArray(parseInt(str_product_price));
        sendMsgToGloLime(0x01, frameId, 0x02, makeCmdDataToBuy(userIdLittleEndian, product_id, product_price));
        frameId++;
        break;
      case 'CANCEL':          //CANCEL:\n
        isVendDone = true;
        logger('CANCEL recieved');
        break;
      default:
        //just log message
        logger('LOG: ' + cmd);
    }
}

function makeCmdDataToGetBalance(cardType, cardUid){
    var data = [];
    data[0] = cardType;
    for (var i = 1, j = 0; i < (cardUid.length+1); i++, j++)
    {
        data[i] = cardUid[j];
    }
    return data;
}

function makeGloLimeRespArray (_addr, _frameId, _cmdCode, cmdData){
	var size = 3 + cmdData.length;
    var array = [];
    var array_bf = [];
    var result = [];

	array[0] = _addr;
	array[1] = _frameId;
	array[2] = _cmdCode;

	var i = 0, j = 3;
	for (i = 0, j = 3; i < cmdData.length; i++, j++)
	{
		array[j] = cmdData[i];
        //console.log('array[' + j + '] = ' + array[j]);
	}

	var checksum = crc16_ccitt(array);

    // bytestuffing
    array_bf = bytestuffToResp(array);
    //console.log('array_bf  ' + array_bf);

    // добавить CRC
    var tmp1 = (checksum >> 8);
    var tmp2 = (checksum & 0x00FF);
    array_bf[array_bf.length] = tmp2;
	array_bf[array_bf.length] = tmp1;

    // добавить PRE и POST
    result = addPrePostAmble(array_bf);
    //console.log('Result  ' + result );
    return result;
}

function addPrePostAmble(array){
    var result = [];
    result[0] = PREAMBLE;
    for (var i = 1, j = 0; j < array.length; i++, j++)
    {
        result[i] = array[j];
    }
    result[result.length] = POSTAMBLE;
    return result;
}

function bytestuffToResp(array){
  var result = [];
  for (var i = 0; i < array.length; i++){
    switch(array[i]){
      case 255: // 0xFF -> 0xFF 0x00
        result = result.concat(255, 0);
        break;
      case 254: // 0xFE -> 0xFF 0x01
        result = result.concat(255, 1);
        break;
      case 253: // 0xFD -> 0xFF 0x02
        result = result.concat(255, 2);
        break;
      default:
        result = result.concat(array[i]);
        break;
    }
  }
  return result;
}

var HOST = "192.168.91.152";
// to make and send message - request - to GloLime by socket 
function sendMsgToGloLime(address, _frameId, comandCode, cmdData){
    var msg = [], msg_str = "";
    //console.log('CmdData:: ' + cmdData);
    msg = makeGloLimeRespArray(address, _frameId, comandCode, cmdData);
    //console.log('MSG array:: ' + msg);
    for (var i = 0; i < msg.length; i++)
    {
        msg_str += msg[i];
    }
    //console.log('MSG STR:: ' + msg_str);
    client.connect({host: HOST, port: 6767},  function(socket) {
        console.log('Client connected');
        console.log('REQUEST :: ' + _getHexStr(msg));
        var s = "";
        buffer = [];
        for (var i = 0; i < msg.length; i++)
        {
			s += String.fromCharCode(msg[i]);
		}
		//console.log('REQUEST str:: ' + s);
		socket.write(s);
		isRespGot = false;
		setTimeout(function (arg) {
        if (!isRespGot){
			console.log(' Timeout Error');
			if (arg) {
				arg.end();
			}
			} else {
          console.log("data received");
			}
		}, 5000, socket);
		socket.on('data', function(data){
			// console.log('RESP:: ' + data);
			var isComplete = false;
			for(var i = 0; i < data.length; i++)
			{
              putByte(data.charCodeAt(i), null);
			}
		});
		socket.on('close',function(){
			console.log('WARNING :: Socket connection closed! ');
			//processGloLimeResponse(buffer);
		});
    });
}

function processGloLimeResponse(resp){
  var cmdExitCode, comandCode, numBalance;
  comandCode = resp[2];
  console.log('RESPONSE:: ' + _getHexStr(resp));
  if (checkCRC16_CCITT(resp)){
    switch (comandCode){
        case 0x01:
          // get Balance command
          console.log(' ==> Process resp on | GetBalance | cmd ');
          break;
        case 0x02:
          // Buy command
          console.log(' ==> Process resp on | makeBuy | cmd ');
          break;
        default:
          console.log(' ==> Cmd code in GloLimeResp unknown ');
          break;
    }
    cmdExitCode = resp[3];
    //console.log(' cmdExitCode' + cmdExitCode);
    switch (cmdExitCode){
      case ERROR_OK:
        console.log(' ==> Operation successful');
        switch (comandCode){
          case 1:
            // getBalance command
            userIdLittleEndian = resp.slice(4,8);
            userId = processLitleEnd(resp.slice(4,8));
            //console.log(' :: userId -> ' + userId);
            var tempBalance = resp.slice(9,13);
            console.log(' :: tempBalance -> ' + tempBalance);
            userType = resp.slice(8,9);
            console.log(' :: userType    -> ' + userType);
			// get Balance value in DEC
            numBalance = processLitleEnd(tempBalance);
            if(!isNaN(numBalance)) {
              isVendDone = false;       //vend session started
              var balanceToSend = numBalance.toString(10)+"\n";
              //console.log("  :: balanceToSend -> " + balanceToSend);
              Serial4.write(balanceToSend);  
              // start timer for VEND session
              //isSessionTimeout = true;          
              //setTimeout(function(){
              //  if(isSessionTimeout) {
              //      console.log("SESSION TIMED OUT");
              //      isVendDone = true;   //vend session closed
              //      isSessionTimeout = false;
              //  }
              //}, 40000);
		    } else {
				console.log("Recieved incorrect data");
			}
            console.log(' :: numBalance  -> ' + numBalance);
            break;
          case 2:
            // Buy command

            break;
          default:
            break;
        }
        break;
      case ERROR_INVALID_CRC:
        console.log('ERROR: CRC incorrect');
        break;
      case ERROR_INVALID_COMMAND:
        console.log('ERROR: Cmd incorrect');
        break;
      case ERROR_INVALID_PARAMETER:
        console.log('ERROR: Cmd parament incorrect');
        break;
      default:
        console.log('Unknown comand exit code');
        break;
    }
  }
}

function checkCRC16_CCITT(resp){
    var respCrc = [resp[resp.length-1], resp[resp.length-2]];
    //console.log(' CRC in resp: ' + respCrc);
    var toCalcCRC = resp.slice(0,(resp.length-2));
    //console.log(' to calc crc ' + toCalcCRC);
    var currCrc = crc16_ccitt(toCalcCRC);
    var tmp1 = (currCrc >> 8);
    var tmp2 = (currCrc & 0x00FF);
    //console.log(' Current CRC: ' + tmp1 + ' ' + tmp2);
    if (tmp1 != respCrc[0]){
      console.log(' !Attention! CRC is not correct');
      return false;
    } else {
      if (tmp2 != respCrc[1]){
        console.log(' !Attention! CRC is not correct');
        return false;
      }
      console.log(' ==> CRC is correct');
      return true;
    }
}

// return HEX value
function processLitleEnd(array){
  var str = "";
  var tmp = array.reverse();
  for(var i=0; i<tmp.length; i++) {
    str += tmp[i].toString(16); 
  }
  return parseInt(str, 16);
}

function makeCmdDataToGetBalance(cardType, cardUid){
    var data = [];
    data[0] = cardType;
    for (var i = 1, j = 0; i < (cardUid.length+1); i++, j++)
    {
        data[i] = cardUid[j];
    }
    return data;
}

//params -> array in little endian
function makeCmdDataToBuy(_userId, _productId, _productPrice){
    var proIdToSend = [];
    proIdToSend[0] = _productId[0];
    proIdToSend[1] = _productId[1];    
    proIdToSend[2] = 0x00;
    proIdToSend[3] = 0x00;
    var prodPriceToSend = [];
    prodPriceToSend[0] = _productPrice[0];
    prodPriceToSend[1] = _productPrice[1];
    prodPriceToSend[2] = 0x00;
    prodPriceToSend[3] = 0x00;    
    return (_userId.concat(proIdToSend).concat(prodPriceToSend));
}

function processUidToSend(uid){
    var str = "", result = [], temp = "";
    //console.log(uid);
    for (var i = 0; i < uid.length; i++)
    {
        temp = uid[i].toString(16);
        if (temp.length < 2){
            temp = "0" + temp;
        }
        str += temp;
    }
    //console.log('uid in str::  ' + str);
    for (var j = 0; j < str.length; j++)
    {
        result[j] = str.charCodeAt(j);
        //console.log("result[j] :: " + result[j]);
    }    
    result[result.length] = 0;
    //console.log("result :: " + result);
    return result;
}

// functions for cmd parser
function putByte(cmdByte, callback){
	switch(cmdByte)
	{
		case PREAMBLE:
			parser_state = BEGIN_STATE;
			break;
		case ESC:
			parser_state = ESCSUM_STATE;
			break;
		case POSTAMBLE:
			parser_state = END_STATE;
            isRespGot = true;
            processGloLimeResponse(buffer);
            //console.log('!!!' + buffer);
            if(callback == 'function') {
              callback();
            }
            //buffer = [];
			break;
		default:
			processByte(cmdByte);
			break;
	}
}

function processByte(cmdByte){
	switch (parser_state){
		case BEGIN_STATE:
			// add to end buffer cmdByte
			buffer = buffer.concat(cmdByte);
			break;
		case ESCSUM_STATE:
			// add to end buffer EscSum[cmdByte]
            //console.log('EscSum' + EscSum);
			buffer = buffer.concat(EscSum[cmdByte]);
			logger(' => buffer.length = ' + buffer.length);
			parser_state = BEGIN_STATE;
			break;
		case END_STATE:
			//
			break;
	}
}

function _getHexStr(data) {
  var str = '';
  for(var i=0; i<data.length; i++) {
    str += ('0x' + data[i].toString(16) + ' ');
  }
  return str;
}

function fireParseComplete(){
	//console.log(_getHexStr(buffer));
}

// functions for calculation CRC16_X25
function crc16_ccitt(bytes){
    var crc = initialValue;
    for (var i = 0; i < bytes.length; i++)
    {
        var curByte = bytes[i] & 0xFF;
        curByte = Reflect8(curByte);
        /* update the MSB of crc value with next input byte */
        crc = (crc ^ (curByte << (width - 8))) & castMask;
        /* this MSB byte value is the index into the lookup table */
        var pos = (crc >> (width - 8)) & 0xFF;
        /* shift out this index */
        crc = (crc << 8) & castMask;
        /* XOR-in remainder from lookup table using the calculated index */
        crc = (crc ^ crcTable[pos]) & castMask;
    }
	crc = ReflectGeneric(crc, width);
    return ((crc ^ finalXorVal) & castMask);
}

function ReflectGeneric(val, width){
    var resByte = 0;
    for (var i = 0; i < width; i++)
    {
        if ((val & (1 << i)) !== 0)
        {
            resByte |= (1 << ((width-1) - i));
        }
    }
    return resByte;
}

function Reflect8(val){
    var resByte = 0;

    for (var i = 0; i < 8; i++)
    {
        if ((val & (1 << i)) !== 0)
        {
            resByte |= ( (1 << (7 - i)) & 0xFF);
        }
    }
    return resByte;
}

var nfc = null;

// start RFID listening
function startRFIDListening() {
	// обработка взаимодействия с RFID меткой
	nfc.on('tag', function(error, data) {
		if (error) {
			print('tag read error');
		} else {
			buffer = [];
			console.log(' ========================================= ');
			console.log('UID        :: ' + data.uid);
			uidToSend = processUidToSend(data.uid);
			console.log('UID in HEX :: ' + uidToSend);
			// Request to GloLime for get Balance value
            if (isVendDone){
                sendMsgToGloLime(0x01, frameId, 0x01, makeCmdDataToGetBalance(0x01, uidToSend));
                frameId++;
                userIdLittleEndian = [];
            }
		}
		// каждые 1000 миллисекунд слушаем новую метку
		setTimeout(function () {
			nfc.listen();
		}, 3500);
	});
}

var command = '';
var internalCmdBuf = '';
// start Serial4 listening
function startSerialListening() {
    setInterval(function() {
        var chars = Serial4.available();
        if(chars > 0) {
			internalCmdBuf += Serial4.read(chars); 
			var lastIdx = internalCmdBuf.indexOf('\n');
			if(lastIdx > 0) {
				command = internalCmdBuf.slice(0, lastIdx);
				internalCmdBuf = internalCmdBuf.slice(lastIdx, internalCmdBuf.length-1);
				processTransportLayerCmd(command);
			}
        }
    }, 5);
}

// Init functions
function nfcInit(error){
  if (error) {
      print('RFID wake up error', error);
  } else {
      print('RFID wake up OK');
      isRFIDOk = true;
      console.log('Clear interval RFID...');
      clearInterval(idRFID);
      // start peripherial
      //P13.set();
      mdbRstPin.set();
      nfc.listen();
      startRFIDListening();
      startSerialListening();
  }
}

function initNfcModule(nfc) {
    console.log("! Starting NFC module");
    //nfc.wakeUp(nfcInit);
    // waiting for RFID wake up
    idRFID = setInterval(function () {
      if (!isRFIDOk){
        // wake up rfid
        console.log("-> isRFIDOk = " + isRFIDOk);
        nfc.wakeUp(function(error){
          if (error) {
              print('RFID wake up error', error);
          } else {
              print('RFID wake up OK');
              isRFIDOk = true;
              console.log('Clear interval RFID...');
              clearInterval(idRFID);
              // start peripherial
              //P13.set();
              mdbRstPin.set();
              nfc.listen();
              startRFIDListening();
              startSerialListening();
          }
        });
      }
    }, 5000);
}

function initPeripherial() {
    console.log("... initialising Peripherial ... ");
    // setup serial for MDB transport communication
    Serial4.setup(115200);

    // setup RFID module
	I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
	//nfc = require("nfc").connect({i2c: I2C1, irqPin: P10});
    nfc = require("nfc").connect({i2c: I2C1, irqPin: rfidIrqPin});
    // setup WiFi module
	/*
	Serial2.setup(115200, { rx: A3, tx : A2 });
	wifi = require("ESP8266WiFi_0v25");

    // start peripherial initialization
    
    if(wifi !== 'undefined') {
        wifi = wifi.connect(Serial2, function(err){
            if (err) {
              logger("Error WiFi module connection");
              throw err;
            } else {
                wifi.reset(function(err){
                  if (err) {
                    logger("Error WiFi module reset");
                    throw err;
                  } else {
                      logger("Connecting to WiFi");
                      wifi.connect(ssid, pass, function(err) {
                        if (err) throw err;
                        isWiFiOk = true;
                        logger("Connected to WiFi");
                        client = require("net");
                        //logger('NET-Client = ' + (client == 'underfined'));
                        clearInterval(idWiFi);
                        // start NFC module initialization
                        initNfcModule(nfc);
                      });
                  }
                });
            }
        });
    }
    /**/
    
    // setup ethernet module
	/**/
    logger("Setup ethernet module");
    SPI2.setup({mosi:B15, miso:B14, sck:B13});
    eth = require("WIZnet").connect(SPI2, P10);
    eth.setIP();
    //glolime static IP
    //eth.setIP({ip: "192.168.0.10", subnet: "255.255.255.0", gateway: "192.168.0.1", dns: "8.8.8.8"});
    var addr = eth.getIP();
    console.log(addr);
    client = require("net");
    initNfcModule(nfc);
	/**/
    
}


//E.on('init', function() {
    //P13.reset();
    mdbRstPin.reset();
    initPeripherial();
//});
