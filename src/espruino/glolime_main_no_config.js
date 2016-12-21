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
var _carouselTimeout = 'undefined';

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
var HOST = "192.168.1.101";
var NETWORK_CONFIG = {mac: "56:44:58:0:0:05", ip: "192.168.1.201", subnet: "255.255.255.0", gateway: "192.168.1.1", dns: "192.168.1.1"};
//var NETWORK_CONFIG = {mac: "56:44:58:0:0:06"};
var HOST_PING_TIMEOUT = 25000;

var PREAMBLE  = 0xFD;
var ESC       = 0xFF;
var POSTAMBLE = 0xFE;

function logger(msg) {
    console.log(msg);
}

var buffer = new Array(0);
var EscSum = new Uint8Array([0xFF, 0xFE, 0xFD]);

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
var isRFIDOk  = false;
var isWiFiOk  = false;

// For setInterval to check WiFi and RFID/NFC
var idWiFi, idRFID;


function disableDevice() {
  isEnabled = false;
  isVendDone = true;
  PIN_DEV_READY.reset();
  PIN_NOT_ENOUGHT_MONEY.reset();
  PIN_CARD_NOT_REGISTERED.reset();
}

function enableDevice() {
  isEnabled = true;
  isVendDone = true;
  PIN_DEV_READY.set();
  PIN_NOT_ENOUGHT_MONEY.reset();
  PIN_CARD_NOT_REGISTERED.reset();
}

function failureDevice() {
  isEnabled = false;
  PIN_DEV_READY.set();
  PIN_NOT_ENOUGHT_MONEY.set();
  PIN_CARD_NOT_REGISTERED.set();
}

function switchLed(led, state) {
  if(state) {
    led.set();
  }
  else {
    led.reset();
  }
}

function blinkCarousel() {
  PIN_CARD_NOT_REGISTERED.reset();
  PIN_DEV_READY.set();
  _carouselTimeout = setTimeout(function() {
    PIN_DEV_READY.reset();
    PIN_NOT_ENOUGHT_MONEY.set();
    _carouselTimeout = setTimeout(function() {
      PIN_NOT_ENOUGHT_MONEY.reset();
      PIN_CARD_NOT_REGISTERED.set();
      _carouselTimeout = setTimeout(blinkCarousel, 250);
    }, 250);
  }, 250);
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

function stopBlinker(intervalId) {
	if(intervalId != 'undefined') {
      clearInterval(intervalId);
      intervalId = 'undefined';
	}
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
        if(_carouselTimeout != 'undefined') {
          clearTimeout(_carouselTimeout);
          _carouselTimeout = 'undefined';
        }
        enableDevice();
		logger('ENABLE recieved');
        break;
      case 'DISABLE':       //DISABLE:\n
        disableDevice();
        logger('DISABLE received');
        break;
      case 'VEND':          //VEND:<PRODUCT ID>:<PRODUCT PRICE>\n
        str_product_id = array[1];
        str_product_price = array[2];
		logger('VEND INFO | PRODUCT ID: ' + str_product_id + '   PRODUCT PRICE: ' + parseInt(str_product_price, 10)/100);
		product_id = uintToByteArray(parseInt(str_product_id, 10)+1);
		product_price = uintToByteArray(parseInt(str_product_price, 10));
		//======================ExtSrv
		var msg = [], msg_str = "";
    		msg = makeGloLimeRespArray(0x01, frameId, 0x02, makeCmdDataToBuy(userIdLittleEndian, product_id, product_price));
		sendMsgToGloLime(msg);
        frameId++; //<--??
        break;
      case 'CANCEL':          //CANCEL:\n
		stopBlinker(_vendBlinkerInterval);
		enableDevice();
        logger('CANCEL recieved');
        break;
      default:
        //FIXME: change to balance ACK message
        if(cmd.length <=10 ) {
          var respInt = parseInt(cmd, 10);
          if(!isNaN(respInt)) {
			stopBlinker(_internalCommTimeout);
            logger('Balance echo: ' + cmd);
          }
        }
        else {
          logger('LOG: ' + cmd);
        }
    }
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
    array_bf = bytestuffToResp(array);
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
		var msg = [], msg_str = "";
    		msg = makeGloLimeRespArray(0x01, frameId, 0x01, makeCmdDataToGetBalance(0x01, uidToSend));
              sendMsgToGloLime(msg); // TODO: ExtSrv
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
	logger(eth.getIP());
	crc = require("CRC16").create();
    client = require("net");
	 var p = require('Ping');
	// ExtSrv MODULE
	// CommGlolime.setup(eth,client,crc,p)
    initNfcModule(nfc);
    setTimeout(function(){
      PIN_MDB_RST.set();
      logger('MDB SET');
	}, 12000);
}


function loadNetworkConfig(){
  var flash = require('Flash');
  var data, settings;
  var addr_free_mem = flash.getFree();
  addr = addr_free_mem[0].addr;
  var data_1 = flash.read(160, addr);
  data = ab2str(data_1);
  settings = JSON.parse(data);
  if (settings){
    HOST = settings.host;
    NETWORK_CONFIG.ip = settings.netconfig.ip;
    NETWORK_CONFIG.mac = settings.netconfig.mac;
    NETWORK_CONFIG.subnet = settings.netconfig.subnet;
    NETWORK_CONFIG.gateway = settings.netconfig.gateway;
    NETWORK_CONFIG.dns = settings.netconfig.dns;
    console.log("HOST = " + HOST + "  NETWORK_CONFIG = " + NETWORK_CONFIG);
  } else {
    console.log("Read config info from Flash ERROR");
  }
}

function ab2str(buf) {
  var str = "";
  for (var i = 0; i < buf.length; i++){
    str+=String.fromCharCode(buf[i]);
  }
  return str;
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  var strLen=str.length;
  for (var i=0; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

var toWriteInFlash = new Uint8Array(0);
var cmdSerial6 = "";
var bufferSerial6 = "";
Serial6.setup(115200);
Serial6.on('data', function(data) {
  failureDevice();
  bufferSerial6 += data;
  var idx = bufferSerial6.indexOf('\n');
  if(idx > 0) {
    cmdSerial6 = bufferSerial6.slice(0, idx);
    bufferSerial6 = bufferSerial6.slice(idx, bufferSerial6.length-1);
    cmdSerial6 = cmdSerial6.trim();
    processSerial6Data();
  }
});

function processSerial6Data(){
	var result = JSON.parse(cmdSerial6);
    console.log(" ===> Result from UART: ");
    console.log(result);
    writeInFlash();
}

function writeInFlash(){
  var toWriteInFlash = str2ab(cmdSerial6);
	var l = toWriteInFlash.length + (4-toWriteInFlash.length%4);
	var buf = new Uint8Array(l);
	var i, j;
	for (i = 0; i<l;i++){
      if (i>toWriteInFlash.length)
		buf[i] = 0;
      else
		buf[i] = toWriteInFlash[i];
	}
	var flash = require('Flash');
	var addr_free_mem = flash.getFree();
	var addr = addr_free_mem[0].addr;
	console.log(" Writing ... ");
	flash.erasePage(addr);
	flash.write(buf, addr);
	console.log(" Writing done! ");
    bufferSerial6 = "";
	reset();
    load();
    enableDevice();
}

E.on('init', function() {
  E.enableWatchdog(10, true);
  process.on('uncaughtException', function() {
    console.log('Uncaught Exception!!!');
    reset();
    load();
  });
  blinkCarousel();
  //loadNetworkConfig();
  initialize();
});

