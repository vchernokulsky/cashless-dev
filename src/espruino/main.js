// GLOBAL CONSTANTS
var SERVICE_ID = 8633;
var DEVICE_ID  = "1";

var PIN_RFID_IRQ = P10; // P9
var PIN_MDB_RST  = P13; // P13
var PIN_ETH_IRQ  = P1;  //B12-стенд_sportlife //P10-стенд //P1-зеленая
var PIN_ETH_RST  = P0;
var PIN_ETH_CS   = B12;
var PIN_WIFI_RST = A4;  //??

// VEND SESSION RESULT CODE
var VEND_SESSION_SUCCESS = 1;
var VEND_SESSION_TIMEOUT = 5;
var VEND_SESSION_FAILURE = 6;

// Indication funds by LEDs
var PIN_NOT_ENOUGHT_MONEY   = P7; // на карте не достаточно средств
var PIN_CARD_NOT_REGISTERED = P6; // карта не зарегистрирована в системе 
var PIN_DEV_READY           = P5;
var GPIO4                   = P4;
var GPIO5                   = P3;

//var SPORTLIFE_HOST = "sync.sportlifeclub.ru";
var SPORTLIFE_HOST = "172.16.0.68";
var SPORTLIFE_STATIC_ADDR = {ip:"172.16.9.161", subnet:"255.255.0.0", gateway:"172.16.0.2", dns:"172.16.0.2"};
var SPORTLIFE_SERVER_TIMEOUT = 2500;

var PRODUCT_DISPENSE_TIMEOUT = 15000;

// SPORTLIFE REST API: GetState error responses
var ERR_CHIP_NUM          = "ErrInvalidChipNum";
var ERR_UNEXPECTED_RESULT = "ErrInvalidResult";
var ERR_DEV_NAME          = "ErrInvalidDeviceName";
var ERR_DEV_NOT_FOUND     = "ErrDeviceOrClubNotFound";
var ERR_CHIP_NOT_FOUND    = "ErrChipNotFound";
var ERR_CHIP_NOT_REG      = "ErrChipNotRegistered";

// WIFI configuration
//var SSID = "VendexFree";
//var PASS = "vendex2016";


// GLOBAL VARIABLES
var isEnabled = false;
var isVendDone = true;

var chip       = "";
var writeoffId = "";
var _sessionId = 1;
var _vendSessionTimeout;
var _respFailureCount = 0;
var _networkFailureCount = 0;

var _commitInterval = 'undefined';
var _serialInterval = 'undefined';
var _balanceAckTimeout = 'undefined';

// simple helper functions
function logger(msg) {
    console.log(msg);
    //Serial2.write(msg + "\r\n");
}

function singleBlink(led, timeout){
	led.set();
	setTimeout(function(led1) {
		led1.reset();
	}, timeout, led);
}

function switchLeds(leds, state) {
  for(var i=0; i<leds.length; i++) {
    if(state) {
      leds[i].set();
    }
    else {
      leds[i].reset();
    }
  }
}

function processPesponse(resp){
	switch(resp){
		case ERR_CHIP_NUM:
            PIN_DEV_READY.reset();
			logger("Error:: Invalid Chip Number");
		break;
		case ERR_UNEXPECTED_RESULT:
            PIN_DEV_READY.reset();
			logger("Error:: Invalid Result");
		break;
		case ERR_DEV_NAME:
            PIN_DEV_READY.reset();
			logger("Error:: Invalid Device Name");
		break;
		case ERR_DEV_NOT_FOUND:
            PIN_DEV_READY.reset();
            logger("Error:: Device Or Club Not Found");
		break;
		case ERR_CHIP_NOT_FOUND:
            PIN_DEV_READY.reset();
			logger("Error:: Chip Not Found");
		break;
		case ERR_CHIP_NOT_REG:
			logger("Error:: Chip Not Registered");
            //PIN_DEV_READY.reset();
			singleBlink(PIN_CARD_NOT_REGISTERED, 5000);
		break;
		default:
			logger("Unknown Error HTTP-response");
		break;
	}
}

function getBalance(sessionId, chipId) {
	var balance = "";
	var numBalance = 0;
	//TODO: read chip id from RFID
	var content = "chip=" + chipId + "&dev=" + DEVICE_ID;
	var options = {
	host: SPORTLIFE_HOST,
		port: '60080',
		path: '/slsrv/Chip/GetState',
		protocol: "http:",
		method: "POST",
		headers: {
			"Content-Type":"application/x-www-form-urlencoded",
			"Content-Length":content.length,
		},
	};
    logger('Session ID:' + sessionId + ' started ... ');
	var timeoutID = setTimeout(function() {
		isVendDone = true;      // for listen RFID
        PIN_DEV_READY.reset();  // green led off
        nfc.listen();
        _respFailureCount++;
		logger("Server is not available for " + SPORTLIFE_SERVER_TIMEOUT/1000 +" sec");
	}, SPORTLIFE_SERVER_TIMEOUT);

    logger('Connecting to Server (getBalance) ... ');
	var http = require("http");
	http.request(options, function(res) {
		logger('Connected to Server (getBalance)');
		var nRecv = 0;
		res.on('data', function(data) {
			nRecv += data.length;
			balance += data;
		});
        res.on('error', function(error) {
          logger('Error in HTTP request: ' + error);
        });
		res.on('close', function(data) {
			logger("Response: " + balance);
            if(sessionId != _sessionId) {
              logger("ERROR: response for previous session");
              return;
            }
			clearTimeout(timeoutID);
			numBalance = parseInt(balance, 10);
			if(!isNaN(numBalance)) {
				if((numBalance/100) >= 30) { //user can start vend operation
                    chip = chipId;
					var fixedPrice = "3000";
					setBalance(sessionId, chipId, fixedPrice);
				} else {
					// not enought money
                    PIN_DEV_READY.reset();
					singleBlink(PIN_NOT_ENOUGHT_MONEY, 5000);
					logger('Attention:: Not enought money');
                    isVendDone = true;
                    nfc.listen();
				}
			} else {
                processPesponse(balance);
                isVendDone = true;
                nfc.listen();
			}
		});
    }).end(content);
}

// REST: WriteOffV2 error responses
function setBalance(sessionId, chipId, price) {
	var content = "dev=" + DEVICE_ID + "&chip=" + chipId + "&srvid=" + SERVICE_ID + "&price=" + price;
	var options = {
		host: SPORTLIFE_HOST,
		port: '60080',
		path: '/slsrv/chip/writeoffv2',
		protocol: "http:",
		method: "POST",
		headers: {
			"Content-Type":"application/x-www-form-urlencoded",
			"Content-Length":content.length
		}
	};
	logger('Connecting to Server (WriteOffV2) ... ');
	var timeoutID = setTimeout(function() {
		isVendDone = true; // for listen RFID
        nfc.listen();
		logger("Server is not available for " + SPORTLIFE_SERVER_TIMEOUT/1000 + " sec");
        _respFailureCount++;
	}, SPORTLIFE_SERVER_TIMEOUT);
	var http = require("http");
	http.request(options, function(res) {
		logger('Connected to Server (WriteOffV2)');
		var nRecv = 0;
		var Resp = "";
		res.on('data', function(data) {
			nRecv += data.length;
			Resp += data;
		});
		res.on('close',function(data) {
            if(sessionId != _sessionId) {
              logger("ERROR: response for previous session");
              return;
            }
			clearTimeout(timeoutID);
			writeoffId = Resp;
			logger("Response: " + writeoffId);
			if ((writeoffId.length < 10) && (parseInt(writeoffId, 10) > 0)) {
                PIN_DEV_READY.set();            // green led on
				Serial4.write("3000\n");        //fixed balance for SportLife (30RUB)
                _balanceAckTimeout = setTimeout(function(){
                  logger('Balance ACK timed out');
                  PIN_DEV_READY.reset();
                  nfc.listen();
                }, 1000);
				logger("Send 30RUB to nucleo");
			} else {
                processPesponse(writeoffId);
                isVendDone = true;
                nfc.listen();
                logger("Incorrect WriteOffId <= 0");
			}
		});
	}).end(content);
}

function writeOffCommit(sContent) {
	logger(' ... WriteOff Commit ... ');
	var content = sContent;
	if(typeof sContent === 'String') {logger("correct content type");}
	var options = {
		host: SPORTLIFE_HOST,
		port: '60080',
		path: '/slsrv/chip/writeoffcommit',
		protocol: "http:",
		method: "POST",
		headers: {
          "Content-Type":"application/x-www-form-urlencoded",
          "Content-Length":content.length
		}
	};
	logger('Connecting to Server (writeOffCommit) ... ');
	var timeoutId = setTimeout(function() {
        timeoutId = 'undefined';
        _respFailureCount++;
		logger('Server is not available for ' + SPORTLIFE_SERVER_TIMEOUT/1000 + ' sec');
	}, SPORTLIFE_SERVER_TIMEOUT);
	var http = require("http");
	http.request(options, function(res) {
		logger("Request content: " + content);
		logger('Connected to Server (writeOffCommit)');
		var nRecv = 0;
		var Resp = "";
		res.on('data', function(data) {
            nRecv += data.length;
            Resp += data;
		});
		res.on('close',function(data) {
            if(timeoutId != 'undefined') {
              clearTimeout(timeoutId);
            }
            if(Resp.toLowerCase() == 'ok') {
                commitQueue.splice(0, 1);
            }
            else {
              logger('ERROR| Server resp: ' + Resp);
            }
		});
	}).end(content);
}

var commitQueue = [];
function processTransportLayerCmd(cmd) {
    var array = cmd.split(':');
    var prefix = array[0];
    switch(prefix) {
      case 'ENABLE':          //ENABLE
        isEnabled = true;
        isVendDone = true;
        switchLeds([PIN_DEV_READY, PIN_NOT_ENOUGHT_MONEY, PIN_CARD_NOT_REGISTERED], false);
        nfc.listen();
        logger('ENABLE recieved');
        break;
      case 'DISABLE':
        isEnabled = false;
        logger('DISABLE received');
        break;
      case 'VEND':          //VEND:<PRODUCT ID>:<PRODUCT PRICE>
        var product_id = array[1];
        var product_price = array[2];
        isVendDone = true;
        logger('VEND INFO | PRODUCT ID: ' + product_id + '   PRODUCT PRICE: ' + parseInt(product_price, 10)/100);
        setTimeout(function(){  //timeout for product dispense
          PIN_DEV_READY.reset();
          nfc.listen();
        }, PRODUCT_DISPENSE_TIMEOUT);
        if(_vendSessionTimeout != 'undefined') {
          logger("Clear timeout for session: " + _sessionId + " timeout id: " + _vendSessionTimeout);
          clearTimeout(_vendSessionTimeout);
          _vendSessionTimeout = 'undefined';
        }
		commitQueue[commitQueue.length] =
			"dev=" + DEVICE_ID +
			"&chip=" + chip +
			"&writeoffid=" + writeoffId +
			"&success=" + VEND_SESSION_SUCCESS;
        break;
      case 'CANCEL':          //RESET
        logger('CANCEL recieved');
        setTimeout(function(){
          PIN_DEV_READY.reset();
          isVendDone = true;
          nfc.listen();
        }, 1500);
        if(_vendSessionTimeout != 'undefined') {
          logger("Clear timeout for session: " + _sessionId + " timeout id: " + _vendSessionTimeout);
          clearTimeout(_vendSessionTimeout);
          _vendSessionTimeout = 'undefined';
        }
		commitQueue[commitQueue.length] =
			"dev=" + DEVICE_ID +
			"&chip=" + chip +
			"&writeoffid=" + writeoffId +
			"&success=" + VEND_SESSION_TIMEOUT;
        break;
      default:
        if(cmd.length < 11) {
          if(!isNaN(parseInt(cmd, 10))) {
            if(_balanceAckTimeout != 'undefined') {
              clearTimeout(_balanceAckTimeout);
              _balanceAckTimeout = 'undefined';
            }
          }
        }
        logger('LOG: ' + cmd);
    }
}

// mifare constants
var MIFARE_AUTH_TYPE = 0;
var RFID_BLOCK_NUM   = 4;
var RFID_KEY = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
function readChipIdFromRFID(uid, keyData, block, callback) {
  var result = "error";
  nfc.authBlock(uid, block, MIFARE_AUTH_TYPE, keyData, function(error, msg) {
    if(error) {
      logger('MSG: ' + msg);
      logger('Block auth error');
      isVendDone = true;
      nfc.listen();
    }
    else {
      nfc.readBlock(block, function(error, data) {
        if(error) {
          logger('Block read error');
          logger('MSG: ' + data);
          isVendDone = true;
          nfc.listen();
        } else {
          result = '';
          for(var i=0; i<data.length; i++) {
            ch1 = data[i].toString(16);
            ch2 = ch1.length > 1 ? ch1 : '0'+ch1;
            result += ch2;
          }
          logger('DATA: ' + result);
        }
        // try to get balance from server
        if ((typeof callback === 'function') && (isVendDone)) {
			isVendDone = false;
			callback(++_sessionId, result);
            //callback(++_sessionId, '00112233445566778899AABBCCDDEEFF');
        }
      });
    }
  });
}

var nfc = 'undefined';
function startRFIDListening() {
  nfc.on('tag', function(error, data) {
    if (error) {
      logger('tag read error');
      switchLeds([PIN_DEV_READY, PIN_NOT_ENOUGHT_MONEY, PIN_CARD_NOT_REGISTERED], true);
      reset();
      load();
    } else {
      logger('RFID touched');
      logger('=> isEnabled = ' + isEnabled + '; isVendDone =' + isVendDone);
      //TODO: convert UID to correct chipid
      if (isEnabled & isVendDone){
        if(data.uid.length == 4) {  //MIFARE CLASSIC
          logger(data);
          readChipIdFromRFID(data.uid, RFID_KEY, RFID_BLOCK_NUM, getBalance);
        }
        else {
          nfc.listen();
        }
      }
    }
  });
}

var COMM_INTERVAL = 10;
var command = '';
var buffer  = '';
function startSerialListening() {
    logger("Start reading Serial4 for every " + COMM_INTERVAL + "ms");
    _serialInterval = setInterval(function() {
        var chars = Serial4.available();
        if(chars > 0) {
          buffer += Serial4.read(chars);
          var lastIdx = buffer.indexOf('\n');
          if(lastIdx > 0) {
            command = buffer.substring(0, lastIdx);
            buffer = buffer.substring(lastIdx, buffer.length-1);
            processTransportLayerCmd(command);
          }
        }
    }, COMM_INTERVAL);
}

function initPeripherial() {
    isEnabled = false;
    isVendDone = true;
    _vendSessionTimeout = 'undefined';
    switchLeds([PIN_DEV_READY, PIN_NOT_ENOUGHT_MONEY, PIN_CARD_NOT_REGISTERED], true);

    PIN_MDB_RST.reset();
    // setup USART interfaces
    // Serial2.setup(115200);   //logger serial port
    if(nfc == 'undefined') {
      Serial4.setup(115200);   //MDB transport serial port
    }

    // setup ethernet module
    logger("Setup ethernet module");
    PIN_ETH_RST.set();
    PIN_ETH_IRQ.set();
    SPI2.setup({mosi:B15, miso:B14, sck:B13});
    eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
    eth.setIP(SPORTLIFE_STATIC_ADDR);
    /*
    eth.setIP({mac: "56:44:58:00:00:03"});
    setTimeout(function(){
      eth.setIP();
      logger(eth.getIP());
      logger("Ethernet module OK");
    }, 1000);
    */
    // setup RFID module
    if(nfc == 'undefined') {
      I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
      nfc = require("nfc").connect({i2c: I2C1, irqPin: PIN_RFID_IRQ});
      nfc.wakeUp(function(error) {
        if (error) {
          logger('RFID wake up error', error);
        } else {
          logger('RFID wake up OK');
          startRFIDListening();
          setTimeout(function(){
              PIN_MDB_RST.set();
              logger('MDB SET');
          }, 12000);
        }
      });
    }
    else {
      setTimeout(function(){
        PIN_MDB_RST.set();
        logger('MDB SET');
        data = Serial4.read(17);
      }, 12000);
    }
}

E.on('init', function() {
    E.enableWatchdog(10, true);
    initPeripherial();
    startSerialListening();
    _commitInterval = setInterval(function() {
      if(commitQueue.length > 0) {
        logger('Queue length: ' + commitQueue.length);
        writeOffCommit(commitQueue[0]);
      } else {
        logger("Queue is empty");
      }
    }, 10000);
});
