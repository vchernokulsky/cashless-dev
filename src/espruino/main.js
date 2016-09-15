var balance = "";
var isEnabled = true;
var isVendDone = true;
var isSessionTimeout = false;

var chip = "";
var deviceId = "1";
var writeoffId = "";
var successId = 1;
var srvid = 8633;
var product_price;
var product_id;

// P10, P13, P1 - зеленая плата
// P9, P0 - стенд

//
var PIN_RFID_IRQ = P10; // P9
var PIN_MDB_RST  = P13; // P13
var PIN_ETH_IRQ  = P1; //B12-стенд_sportlife //P10-стенд //P1-зеленая
var PIN_ETH_RST  = P0;
var PIN_ETH_CS      = B12;
var PIN_WIFI_RST = A4;  //??
// Indication funds by LEDs
var PIN_NOT_ENOUGHT_MONEY   = P7; // на карте не достаточно средств
var PIN_CARD_NOT_REGISTERED = P6; // карта не зарегистрирована в системе 
var PIN_DEV_READY           = P5;
var GPIO4                   = P4;
var GPIO5                   = P3;

// for checking connect to Server
var isServerAvailable 	 = false;
var isGetBalanceSent	 = false;
var isWriteOffV2Sent 	 = false;
var isWriteOffCommitSent = false;

var SPORTLIFE_HOST = "sync.sportlifeclub.ru";
//var SPORTLIFE_HOST = "172.16.0.68";
//var SPORTLIFE_STATIC_ADDR = {ip:"172.16.9.161", subnet:"255.255.0.0", gateway:"172.16.0.2", dns:"172.16.0.2"};

// WIFI configuration
//var ssid = "VendexFree";
//var pass = "vendex2016";

function logger(msg) {
    console.log(msg);
    //Serial2.write(msg + "\r\n");
}

// REST: GetState error responses
var ERR_CHIP_NUM          = "ErrInvalidChipNum";
var ERR_UNEXPECTED_RESULT = "ErrInvalidResult";
var ERR_DEV_NAME          = "ErrInvalidDeviceName";
var ERR_DEV_NOT_FOUND     = "ErrDeviceOrClubNotFound";
var ERR_CHIP_NOT_FOUND    = "ErrChipNotFound";
var ERR_CHIP_NOT_REG      = "ErrChipNotRegistered";

function getBalance(chipId, devId) {
	isServerAvailable = false;
	balance = "";
	var numBalance = 0;
	//TODO: read chip id from RFID
	var content = "chip="+chipId+"&dev="+devId;
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
	logger('Connectiong to Server (getBalance) ... ');
	var http = require("http");
    PIN_DEV_READY.set();  // green led on
	var timeoutID = setTimeout(function() {
		isVendDone = true;      // for listen RFID
        PIN_DEV_READY.reset();  // green led off
		logger("Server is not available for 5 sec");
	},5000);
	http.request(options, function(res) {
		logger('Connected to Server (getBalance)');
		var nRecv = 0;
		res.on('data', function(data) {
			nRecv += data.length;
			balance += data;
			//logger('Received data :: ' + balance);
		});
		res.on('close',function(data) {
			clearTimeout(timeoutID);
			//logger("Server connection closed, " + nRecv + " bytes received.");
			logger("Response: " + balance);
			// send balance to MDB transport
			numBalance = parseInt(balance, 10);
			//logger("parseInt Result: " + numBalance);
			if(!isNaN(numBalance)) {
				if((numBalance/100) > 30) { //user can start vend operation
					//isVendDone = false;       //vend session started
					product_price = "3000";
					setBalance(deviceId, chip, srvid, product_price);
				} else {
					// not enought money
                    PIN_DEV_READY.reset();
					singleBlink(PIN_NOT_ENOUGHT_MONEY,5000);
					logger('Attention:: Not enought money');
                    isVendDone = true;
				}
			} else {
				processPesponse(balance);
				isVendDone = true;
			}
			isServerAvailable = true;
		});
 	}).end(content);
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
            PIN_DEV_READY.reset();
			singleBlink(PIN_CARD_NOT_REGISTERED, 5000);
		break;
		default:
			logger("Unknown Error HTTP-response");
		break;
	}
}

// REST: WriteOffV2 error responses
function setBalance(devId, chip, srvid, price) {
	isServerAvailable = false;
	var content = "dev=" + devId + "&chip=" + chip + "&srvid=" + srvid + "&price=" + price;
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
	var timeoutID = setTimeout(function(){
		isVendDone = true; // for listen RFID
		logger("Server is not available for 5 sec");
	},5000);
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
			clearTimeout(timeoutID);
			//logger("Server connection closed, " + nRecv + " bytes received.");
			logger("Response: " + writeoffId);
			writeoffId = Resp;
			if (parseInt(writeoffId,10) > 0 ){
				Serial4.write("3000\n");  //fixed balance for SportLife (30RUB)
				logger("Send 30RUB to nucleo");
			} else {
				logger("WriteOffId <= 0");
				processPesponse(writeoffId);
				isVendDone = true;
			}
			isServerAvailable = true;
		});
	}).end(content);
}


function writeOffCommit (sContent) {
	isServerAvailable = false;
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
	logger('Connectiong to Server (writeOffCommit) ... ');
	var toID = setTimeout(function(){
		isVendDone = true; // for listen RFID
		logger("Server is not available for 5 sec");
	},5000);
	var http = require("http");
	http.request(options, function(res) {
		logger("Request content: " + content);
		logger('Connected to Server (writeOffCommit)');
		var nRecv = 0;
		var Resp = "";
		res.on('data', function(data) {
		  nRecv += data.length;
		  Resp += data;
		  //logger("Response: " + Resp);
		});
		res.on('close',function(data) {
			clearTimeout(toID);
		  //logger("Server connection closed, " + nRecv + " bytes received.");
		  logger("Response: " + Resp);
		  if(Resp.toLowerCase() == 'ok') {
			commitQueue.splice(0,1);
		  }
		  isServerAvailable = true;
		});
	}).end(content);
}

function singleBlink(led, timeout){
	led.set();
	setTimeout(function(){
		led.reset();
	},timeout);
}

var commitQueue = [];
function processTransportLayerCmd(cmd) {
    //var prefix = cmd.substr(0, PREFIX_LEN);
    var array = cmd.split(':');
    var prefix = array[0];
    switch(prefix) {
      case 'ENABLE':          //ENABLE
        isEnabled = true;
        isVendDone = true;
        logger('ENABLE recieved');
        //LED notification
        LED1.set();
        setTimeout(function(){LED1.reset();}, 3000);
        break;
      case 'DISABLE':
        isEnabled = false;
        logger('DISABLE received');
        break;
      case 'VEND':          //VEND:<PRODUCT ID>:<PRODUCT PRICE>
        product_id = array[1];
        product_price = array[2];
        //send writeoffCommit to SportLife server
        isVendDone = true;
        LED1.reset();
        PIN_DEV_READY.reset();
        logger('VEND INFO | PRODUCT ID: ' + product_id + '   PRODUCT PRICE: ' + parseInt(product_price, 10)/100);
        // код завершения операции/продажи: 1 - успешно
        successId  = 1;
		commitQueue[commitQueue.length] =
			"dev="+deviceId+
			"&chip="+chip+
			"&writeoffid="+writeoffId+
			"&success="+successId;
        break;
      case 'CANCEL':          //RESET
        LED1.reset();
        PIN_DEV_READY.reset();        
        isVendDone = true;
        successId  = 5; 
		commitQueue[commitQueue.length] =
			"dev="+deviceId+
			"&chip="+chip+
			"&writeoffid="+writeoffId+
			"&success="+successId;
		//writeoffCommit(chip,writeoffId,successId);
        logger('CANCEL recieved');
        break;
      default:
        //just log message
        logger('LOG: ' + cmd);
    }
}

// mifare constants
var MIFARE_AUTH_TYPE = 0;
var RFID_BLOCK_NUM = 4;
var RFID_KEY = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
function readChipIdFromRFID(uid, keyData, block, callback) {
  var result = "error";
  nfc.authBlock(uid, block, MIFARE_AUTH_TYPE, keyData, function(error, msg) {
    if(error) {
      logger('MSG: ' + msg);
      logger('Block auth error');
    }
    else {
      nfc.readBlock(block, function(error, data) {
        if(error) {
          logger('Block read error');
          logger('MSG: ' + data);
        } else {
          //logger('Block #' + block + ' data: ' + data);
          result = '';
          for(var i=0; i<data.length; i++) {
            ch1 = data[i].toString(16);
            ch2 = ch1.length > 1 ? ch1 : '0'+ch1;
            result += ch2;
          }
          chip = result;
          logger('DATA: ' + result);
        }
        // try to get balance from server
        if ((typeof callback === 'function') && (isVendDone)) {
			isVendDone = false;
			callback(chip, deviceId);
        }
      });
    }
  });
}

function startRFIDListening() {
// обработка взаимодействия с RFID меткой
    nfc.on('tag', function(error, data) {
      if (error) {
        logger('tag read error');
      } else {
        logger('RFID touched');
        //TODO: convert UID to correct chipid
        if (isEnabled & isVendDone){
            logger(data);    // UID и ATQA
            readChipIdFromRFID(data.uid, RFID_KEY, RFID_BLOCK_NUM, getBalance);
        }
        setTimeout(function () {
          nfc.listen();
        }, 3500);
      }
    });
}

var command = '';
var buffer  = '';
function startSerialListening() {
    setInterval(function() {
        var chars = Serial4.available();
        if(chars > 0) {
          buffer += Serial4.read(chars);
          //console.log("BUFFER: " + buffer);
          var lastIdx = buffer.indexOf('\n');
          if(lastIdx > 0) {
            command = buffer.substring(0, lastIdx);
            buffer = buffer.substring(lastIdx, buffer.length-1);
            processTransportLayerCmd(command);
          }
        }
    }, 5);
}

var nfc = null;
//,	eth = null;
function initPeripherial() {
    // init nucleo state
    PIN_MDB_RST.reset();
	PIN_DEV_READY.reset();
	logger('MDB RESET');

    // setup USART interfaces
    //Serial2.setup(115200);   //logger serial port
    Serial4.setup(115200);   //MDB transport serial port

    // setup ethernet module
    /**/
    logger("Setup ethernet module");
    PIN_ETH_RST.set();
    PIN_ETH_IRQ.set();
    SPI2.setup({mosi:B15, miso:B14, sck:B13});
    eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
    //eth.setIP(SPORTLIFE_STATIC_ADDR);
    eth.setIP({mac: "56:44:58:00:00:03"});
    var addr = eth.getIP();
    logger(addr);
    logger("Ethernet module OK");
    /**/
  
    // setup RFID module
    I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
    nfc = require("nfc").connect({i2c: I2C1, irqPin: PIN_RFID_IRQ});
    nfc.wakeUp(function(error) {
      if (error) {
        logger('RFID wake up error', error);
      } else {
        logger('RFID wake up OK');
		setTimeout(function(){
			PIN_MDB_RST.set();
			logger('MDB SET');
			//PIN_DEV_READY.set();
		}, 12000);
        nfc.listen();
      }
    });
}

/**/
E.on('init', function() {
    initPeripherial();
    startRFIDListening();
    startSerialListening();
    setInterval(function(){
	  if(commitQueue.length > 0) {
		  writeOffCommit(commitQueue[0]);
	  } else {
		  logger("Queue is empty");
	  }
    }, 10000);
});
/**/