var nfc = null;
var balance = "";

var isEnabled = false;
var isVendDone = true;

var _sessionId = 0;
var _failuresCount = 0;

var _serialInterval = 'undefined';
var _serverWakeupInterval = 'undefined';
var _vendBlinkerInterval = 'undefined';

var _internalCommTimeout = 'undefined';

var PIN_RFID_IRQ = P10;  // P10
var PIN_MDB_RST  = P13;  // P13
var PIN_ETH_IRQ  = P1;
var PIN_ETH_RST  = P0;
var PIN_ETH_CS   = B12;
var PIN_WIFI_RST = A4;

// Indication funds by LEDs
var PIN_NOT_ENOUGHT_MONEY   = P7;
var PIN_CARD_NOT_REGISTERED = P6;
var PIN_DEV_READY           = P5;
var GPIO4                   = P4;
var GPIO5                   = P3;

// Network configuration
var HOST = "192.168.0.5";
//var NETWORK_CONFIG = {mac: "56:44:58:0:0:05", ip: "192.168.20.205", subnet: "255.255.255.0", gateway: "192.168.20.1", dns: "192.168.20.1"};
var NETWORK_CONFIG = {mac: "56:44:58:0:0:06"};
var HOST_PING_TIMEOUT = 25000;

var PREAMBLE  = 0xFD;
var ESC       = 0xFF;
var POSTAMBLE = 0xFE;

var BEGIN_STATE  = 1;
var ESCSUM_STATE = 2;
var END_STATE    = 3;

// default parser state
var parser_state = BEGIN_STATE;

function logger(msg) {
    console.log(msg);
}

var buffer = new Array(0);
var EscSum = new Uint8Array([0xFF, 0xFE, 0xFD]);

var errorCode,
	crc16;

var ERROR_OK                = 0x00,
    ERROR_INVALID_CRC       = 0xFF,
    ERROR_INVALID_COMMAND   = 0xFE,
    ERROR_INVALID_PARAMETER = 0xFD,

	ERROR_INSUFFICIENT_FUNDS   = 0xFB,
	ERROR_NON_EXISTENT_PRODUCT = 0XFA,
	ERROR_NON_EXISTENT_USER    = 0XF9,
	ERROR_NON_EXISTENT_SALE    = 0xF8,
	ERROR_NOT_REGISTERED_CARD  = 0xFC;


// Frame ID
var frameId = 0x00;

// for CRC16_X25 calculation
var crc;
// HEX user's UID for Request to GloLime
var uidToSend;

var gloLimeResponse = [];

// For communications
var client, wifi;

var userId;
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
//device states
var INACTIVE,	
	ENABLED,
	DISABLED,
	VEND,
	CONNECT_LOST;
// default device state
var dev_state = INACTIVE;
function process_state(){
	switch(dev_state){
		case INACTIVE:
		
			break;
		case ENABLED:
		
			break;
		case DISABLED:
		
			break;
		case VEND:
		
			break;
		case CONNECT_LOST:
		
			break;
		default:

			break;	
	}
	
};

function process_enabled(){
	isEnabled = true;
	isVendDone = true;
	PIN_DEV_READY.set();
};
function process_vend(str_product_id,str_product_price){
	
	
};
function process_idle(){
	
};
function process_disable(){
	
};
function process_connectLost(){
	
};

function clearVendBlinker(idBlinkerInterval){
	if(idBlinkerInterval != 'undefined') {
	  clearInterval(idBlinkerInterval);
	  idBlinkerInterval = 'undefined';
	  PIN_DEV_READY.set();
	}	
};

function clearCommBlinker(idCommInterval){
	if(idCommInterval != 'undefined') {
	  logger('Balance echo: ' + cmd);
	  clearTimeout(idCommInterval);
	  idCommInterval = 'undefined';
	}
};


function _getHexStr(data) {
  var str = '';
  for(var i=0; i<data.length; i++) {
    str += ('0x' + data[i].toString(16) + ' ');
  }
  return str;
}

function switchLed(led, state) {
  if(state) {
    led.set();
  }
  else {
    led.reset();
  }
}

function singleBlink(led, timeout){
	switchLed(led, true);
	setTimeout(function(){
		switchLed(led, false);
	}, timeout);
}

function startBlinker(led, period) {
  var blinkFlag = false;
  var intervalId = setInterval(function(){
    blinkFlag = !blinkFlag;
    switchLed(led, blinkFlag);
  }, period, blinkFlag);
  return intervalId;
}

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

function processTransportLayerCmd(cmd) {
    var array = cmd.split(':');
    var prefix = array[0];
    switch(prefix) {
      case 'BALANCE':
        logger('Balance ACK recieved');
        break;
      case 'ENABLE':          //ENABLE:\n
        process_enabled();
		logger('ENABLE recieved');
        break;
      case 'DISABLE':       //DISABLE:\n
        isEnabled = false;
        logger('DISABLE received');
        break;
      case 'VEND':          //VEND:<PRODUCT ID>:<PRODUCT PRICE>\n
        str_product_id = array[1];
        str_product_price = array[2];
		process_vend();
		logger('VEND INFO | PRODUCT ID: ' + str_product_id + '   PRODUCT PRICE: ' + parseInt(str_product_price, 10)/100);
		product_id = uintToByteArray(parseInt(str_product_id, 10)+1);
		product_price = uintToByteArray(parseInt(str_product_price, 10));
		sendMsgToGloLime(0x01, frameId, 0x02, makeCmdDataToBuy(userIdLittleEndian, product_id, product_price));
		frameId++;
		clearVendBlinker(_vendBlinkerInterval);
        break;
      case 'CANCEL':          //CANCEL:\n
		clearVendBlinker(_vendBlinkerInterval);
		process_enabled();
        logger('CANCEL recieved');
        break;
      default:
        //FIXME: change to balance ACK message
        if(cmd.length <=10 ) {
          var respInt = parseInt(cmd, 10);
          if(!isNaN(respInt)) {
			clearCommBlinker(_internalCommTimeout);
          }
        }
        else {
          logger('LOG: ' + cmd);
        }
    }
}

function makeCmdDataToGetBalance(cardType, cardUid){
    var data = [];
    data[0] = cardType;
    for (var i = 1, j = 0; i < (cardUid.length+1); i++, j++) {
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
    for (i = 0, j = 3; i < cmdData.length; i++, j++) {
		array[j] = cmdData[i];
	}

	var checksum = crc.calculate(array);

    // bytestuffing
    array_bf = bytestuffToResp(array);

    // добавить CRC
    var tmp1 = (checksum >> 8);
    var tmp2 = (checksum & 0x00FF);
    array_bf[array_bf.length] = tmp2;
	array_bf[array_bf.length] = tmp1;

    result = addPrePostAmble(array_bf);
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

function disableDevice() {
  isEnabled = false;
  PIN_DEV_READY.set();
  PIN_NOT_ENOUGHT_MONEY.set();
  PIN_CARD_NOT_REGISTERED.set();
  if(_serialInterval != 'undefined') {
    clearInterval(_serialInterval);
    _serialInterval = 'undefined';
  }
}

function enableDevice() {
  isEnabled = true;
  isVendDone = true; //<-- ???
  PIN_DEV_READY.set();
  PIN_NOT_ENOUGHT_MONEY.reset();
  PIN_CARD_NOT_REGISTERED.reset();
  startSerialListening();
}

function waitForServerWakeup() {
  logger('Server waiting...');
  if(_vendBlinkerInterval != 'undefined') {
    clearInterval(_vendBlinkerInterval);
    _vendBlinkerInterval = 'undefined';
  }
  disableDevice();

  _pingInterval = startBlinker(PIN_CARD_NOT_REGISTERED, 500);
  _serverWakeupInterval = setInterval(function() {
    var p = require('Ping');
    p.ping({ address: HOST, port:6767, timeout:2000, attempts:2 }, function(err, data) {
      if(data != 'undefined') {
        logger('Server started!!!');
        if(_serverWakeupInterval != 'undefined') {
          clearInterval(_serverWakeupInterval);
          _serverWakeupInterval = 'undefined';
        }
        if(_pingInterval != 'undefined') {
          clearInterval(_pingInterval);
          _pingInterval = 'undefined';
        }
        enableDevice();
      }
      else {
        if(err != 'undefined') {
          console.log('Server does not respond');
        }
      }
    });
  }, HOST_PING_TIMEOUT);
}

function sendMsgToGloLime(address, _frameId, comandCode, cmdData){
    var msg = [], msg_str = "";
    msg = makeGloLimeRespArray(address, _frameId, comandCode, cmdData);
    for (var i = 0; i < msg.length; i++) {
        msg_str += msg[i];
    }
    console.log('MSG STR   :: ' + msg_str);

    var refSocket = 'undefined';
    var timeoutId = setTimeout(function () {
      logger('Timeout Error');
      _failuresCount++;
      if((_failuresCount%3) === 0) {
        waitForServerWakeup();
      }
      else {
		clearVendBlinker(_vendBlinkerInterval);
        isVendDone = true; // enable 
      }

      if(refSocket != 'undefined') {
        refSocket.end();
      }
    }, 5000);
    client.connect({host: HOST, port: 6767},  function(socket) {
        console.log('Client connected');
        console.log('REQUEST :: ' + _getHexStr(msg));
        var s = "";
        buffer = [];
        for (var i = 0; i < msg.length; i++) {
			s += String.fromCharCode(msg[i]);
		}
        refSocket = socket;
		socket.write(s);
		isRespGot = false;
		socket.on('data', function(data) {
            try {
              clearTimeout(timeoutId);
            } catch(ex) {
              logger("Exception: " + ex);
            }
			var isComplete = false;
			for(var i = 0; i < data.length; i++) {
              putByte(data.charCodeAt(i), null);
			}
		});
		socket.on('close',function(){
			console.log('Socket connection closed! ');
		});
    });
}

function processGloLimeResponse(resp){
	var cmdExitCode, comandCode, numBalance;
	comandCode = resp[2];
	console.log('RESPONSE:: ' + _getHexStr(resp));
    if (crc.check(resp)){//checkCRC16_CCITT(resp)){
		switch (comandCode){
			case 0x01: // Get balance command
              logger(' ==> Process resp on | GetBalance | cmd ');
              break;
			case 0x02: // Buy command
              logger(' ==> Process resp on | makeBuy | cmd ');
              break;
			default:
              logger(' ==> Cmd code in GloLimeResp unknown ');
              break;
		}
		cmdExitCode = resp[3];
        if(cmdExitCode == ERROR_OK) {
          console.log(' ==> Operation successful');
          switch (comandCode){
            case 1:
              // getBalance command
              userIdLittleEndian = resp.slice(4,8);
              userId = processLitleEnd(resp.slice(4,8));
              var tempBalance = resp.slice(9,13);
              console.log(' :: tempBalance -> ' + tempBalance);
              userType = resp.slice(8,9);
              console.log(' :: userType    -> ' + userType);
              numBalance = processLitleEnd(tempBalance);
              if(!isNaN(numBalance)) {
                if (numBalance >= 2500) {
                  //isVendDone = false;       //vend session started
                  var balanceToSend = numBalance.toString(10)+"\n";
                  logger("  :: balanceToSend -> " + balanceToSend);
                  //TODO: change to balance ACK
                  Serial4.write(balanceToSend);
                  _internalCommTimeout = setTimeout(function(){
                    logger('ERROR: Balance ACK timeout');
                    isVendDone = true;
                    if(_vendBlinkerInterval != 'undefined') {
                      clearInterval(_vendBlinkerInterval);
                      _vendBlinkerInterval = 'undefined';
                    }
                  }, 2000);

                } else {
                  console.log("Attention:: Not enought money");
                  singleBlink(PIN_NOT_ENOUGHT_MONEY,5000);
                  if(_vendBlinkerInterval != 'undefined') {
                    clearInterval(_vendBlinkerInterval);
                    _vendBlinkerInterval = 'undefined';
                  }
                  isVendDone = true;
                }
              } else {
                logger("Recieved incorrect data");
              }
              logger(' :: numBalance  -> ' + numBalance);
              break;
            case 2:
              // Buy command
              break;
            default:

              break;
          }
        }
        else {
          switch (cmdExitCode){
              case ERROR_INVALID_CRC:
                console.log('ERROR: CRC incorrect');
                isVendDone = true;
              break;
              case ERROR_INVALID_COMMAND:
                  console.log('ERROR: Cmd incorrect');
              break;
              case ERROR_INVALID_PARAMETER:
                  console.log('ERROR: Cmd parament incorrect');
              break;
              case ERROR_INVALID_CRC:
                  console.log('ERROR: CRC INCORRECT');
              break;
              case ERROR_INVALID_COMMAND:
                  console.log('ERROR: CMD INCORRECT');
              break;
              case ERROR_INVALID_PARAMETER:
                  console.log('ERROR: CMD PARAMENT INCORRECT');
              break;
              case ERROR_INSUFFICIENT_FUNDS:
                  console.log('ERROR: INSUFFICIENT FUNDS ');
                  singleBlink(PIN_NOT_ENOUGHT_MONEY,5000);
              break;
              case ERROR_NON_EXISTENT_PRODUCT:
                  console.log('ERROR: PRODUCT DOES NOT EXIST');
              break;
              case ERROR_NON_EXISTENT_USER:
                  console.log('ERROR: USER DOES NOT EXIST');
              break;
              case ERROR_NON_EXISTENT_SALE:
                  console.log('ERROR: SALE DOES NOT EXIST');
              break;
              case ERROR_NOT_REGISTERED_CARD:
                  console.log('ERROR: CARD DOES NOT REGISTERED');
                  singleBlink(PIN_CARD_NOT_REGISTERED, 5000);
              break;
              default:
                  console.log('Unknown comand exit code');
              break;
          }
          if(_vendBlinkerInterval != 'undefined') {
            clearInterval(_vendBlinkerInterval);
            _vendBlinkerInterval = 'undefined';
          }
          isVendDone = true;
        }
	}
}

// return HEX value
function processLitleEnd(array) {
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
    for (var i = 1, j = 0; i < (cardUid.length+1); i++, j++) {
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
    for (var i = 0; i < uid.length; i++) {
        temp = uid[i].toString(16);
        if (temp.length < 2) {
            temp = "0" + temp;
        }
        str += temp;
    }
    for (var j = 0; j < str.length; j++) {
        result[j] = str.charCodeAt(j);
    }
    result[result.length] = 0;
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
            if(callback == 'function') {
              callback();
            }
			break;
		default:
			processByte(cmdByte);
			break;
	}
}

function processByte(cmdByte){
	switch (parser_state) {
		case BEGIN_STATE:
			buffer = buffer.concat(cmdByte);
			break;
		case ESCSUM_STATE:
			buffer = buffer.concat(EscSum[cmdByte]);
			logger(' => buffer.length = ' + buffer.length);
			parser_state = BEGIN_STATE;
			break;
		case END_STATE:
			//
			break;
	}
}

function startRFIDListening() {
	nfc.on('tag', function(error, data) {
        logger("Frame ID:" + frameId + "  Failures count:" + _failuresCount);
		if (error) {
			print('tag read error');
            //TODO: nfc reader reinitialization
            reset();
            load();
		} else {
            logger('isEnabled: ' + isEnabled + '   isVendDone: ' + isVendDone);
            if (isEnabled && isVendDone){
              buffer = [];
              uidToSend = processUidToSend(data.uid);
              isVendDone = false;       //vend session started
              _vendBlinkerInterval = startBlinker(PIN_DEV_READY, 500);
              sendMsgToGloLime(0x01, frameId, 0x01, makeCmdDataToGetBalance(0x01, uidToSend));
              frameId++;
              userIdLittleEndian = [];
            }
		}
		setTimeout(function () {
			nfc.listen();
		}, 3500);
	});
}

var command = '';
var internalCmdBuf = '';
// start Serial4 listening
function startSerialListening() {
    logger("Start Serial4 listening for every 25ms");
    _serialInterval = setInterval(function() {
        var chars = Serial4.available();
        if(chars > 0) {
			internalCmdBuf += Serial4.read(chars);
        }
        var lastIdx = internalCmdBuf.indexOf('\n');
        if(lastIdx > 0) {
          command = internalCmdBuf.slice(0, lastIdx);
          internalCmdBuf = internalCmdBuf.slice(lastIdx+1, internalCmdBuf.length-1);
          processTransportLayerCmd(command);
        }
    }, 25);
}

function initNfcModule(nfc) {
    console.log("! Starting NFC module");
    // waiting for RFID wake up
    idRFID = setInterval(function () {
      if (!isRFIDOk){
        // wake up rfid
        console.log("-> isRFIDOk = " + isRFIDOk);
        nfc.wakeUp(function(error){
          if (error) {
            print('RFID wake up error', error);
            reset();
            load();
          } else {
              print('RFID wake up OK');
              isRFIDOk = true;
              console.log('Clear interval RFID...');
              clearInterval(idRFID);
              // start peripherial
              nfc.listen();
              startRFIDListening();
              startSerialListening();
          }
        });
      }
    }, 5000);
}

function initialize() {
    console.log("... peripherial initialising ... ");
    PIN_MDB_RST.reset();
	PIN_DEV_READY.reset();
    logger("MDB RESET");
    // setup serial for MDB transport communication
    Serial4.setup(115200);
    // setup RFID module
	I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
    nfc = require("nfc").connect({i2c: I2C1, irqPin: PIN_RFID_IRQ});
    // setup ethernet module
    logger("Setup ethernet module");
    PIN_ETH_RST.set();
    PIN_ETH_IRQ.set();
    SPI2.setup({mosi:B15, miso:B14, sck:B13});
    eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
    eth.setIP(NETWORK_CONFIG);
	crc = require("CRC16").create();
    logger("CRC module : ");
    logger(crc);
    client = require("net");
    initNfcModule(nfc);
    setTimeout(function(){
      PIN_MDB_RST.set();
      logger('MDB SET');
	}, 12000);
}

E.on('init', function() {
  E.enableWatchdog(10, true);
  process.on('uncaughtException', function() {
    console.log('Uncaught Exception!!!');
    reset();
    load();
  });
  initialize();
});
