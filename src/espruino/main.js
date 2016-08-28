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

// 
var rfidIrqPin = P10; // P9
var mdbRstPin  = P13;  // P0
var ethIrqPin  = P1;
var wifiRstPin = A4;  //??

var SPORTLIFE_HOST = "sync.sportlifeclub.ru";
//var SPORTLIFE_HOST = "172.16.0.68";

// WIFI configuration
//var ssid = "neiron";
//var pass = "msp430f2013";

//var ssid = "service";
//var pass = "921249514821";

var ssid = "VendexFree";
var pass = "vendex2016";

// var ssid = "SauronAP";
// var pass = "yuwb3795";

// buffer for writeoffCommit
var writeoffQueue = [];


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
      "Content-Length":content.length
    }
  };
  logger('Connectiong to Server ... ');
  var http = require("http");
  http.request(options, function(res) {
    logger('Connected to Server');
    var nRecv = 0;
    res.on('data', function(data) {
      nRecv += data.length;
      balance += data;
    });
    res.on('close',function(data) {
      logger("Server connection closed, " + nRecv + " bytes received.");
      logger("Response: " + balance);
      // send balance to MDB transport
      numBalance = parseInt(balance, 10);
      if(!isNaN(numBalance)) {
        if((numBalance/100) > 30) { //user can start vend operation
          isVendDone = false;       //vend session started
          LED1.set();
          Serial4.write("3000\n");  //fixed balance for SportLife (30RUB)
          logger("Send 30RUB to nucleo");
          product_price = "3000";
          setBalance(deviceId, chip, srvid, product_price);
        }
      } else {
        logger("Recieved incorrect data");
      }
    });
  }).end(content);
}

// REST: WriteOffV2 error responses
function setBalance(devId, chip, srvid, price) {
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
  logger('Connecting to Server ... ');
  var http = require("http");
  http.request(options, function(res) {
    logger('Connected to Server');
    var nRecv = 0;
    var Resp = "";
    res.on('data', function(data) {
      nRecv += data.length;
      Resp += data;
    });
    res.on('close',function(data) {
      writeoffId = Resp;
      logger("Server connection closed, " + nRecv + " bytes received.");
      logger("Response: " + Resp);
    });
  }).end(content);
}

function writeoffCommit (content/*chip, devId, writeoffId, success*/) {
  logger(' ... WriteOff Commit ... ');
  //var content = "dev="+devId+"&chip="+chip+"&writeoffid="+writeoffId+"&success="+success;
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
  logger('Connectiong to Server ... ');
  var http = require("http");
  http.request(options, function(res) {
    console.log("Request content: " + content);
    logger('Connected to Server');
    var nRecv = 0;
    var Resp = "";
    res.on('data', function(data) {
      nRecv += data.length;
      Resp += data;
    });
    res.on('close',function(data) {
      logger("Server connection closed, " + nRecv + " bytes received.");
      logger("Response: " + Resp);
    });
  }).end(content);
}

function addToWriteoffQueue(chip, writeoffId, _successId){
    var contentToQueue = "dev="+deviceId+"&chip="+chip+"&writeoffid="+writeoffId+"&success="+_successId;
    writeoffQueue[writeoffQueue.length] = contentToQueue;
}

var PREFIX_LEN = 5;
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
        logger('VEND INFO | PRODUCT ID: ' + product_id + '   PRODUCT PRICE: ' + parseInt(product_price, 10)/100);
        //setBalance(chip, srvid, price);
        // код завершения операции/продажи: 1 - успешно
        successId  = 1; 
        addToWriteoffQueue(chip,writeoffId,successId);
        break;
      case 'CANCEL':          //RESET
        LED1.reset();
        isVendDone = true;
        successId  = 5; 
		addToWriteoffQueue(chip,writeoffId,successId);
        logger('CANCEL recieved');
        break;
      default:
        //just log message
        logger('LOG: ' + cmd);
    }
}

function sendWriteoffCommit(){
	if (writeoffQueue.length > 0){
		// pop a head of writeoffQueue
		var contentToReq = writeoffQueue.splice(0,1);
		// make writeoffCommit
		writeoffCommit(contentToReq);
	} else {
		console.log(" ... Writeoff Queue is empty");
	}
}

function processWriteoffQueue(){
	setInterval(function() {
		sendWriteoffCommit();
	}, 5000);
}

var nfc = null;
function initPeripherial() {
    // init nucleo state
    mdbRstPin.reset();

    // setup USART interfaces
    //Serial2.setup(115200);   //logger serial port
    Serial4.setup(115200);   //MDB transport serial port

    // setup ethernet module
    /*
    logger("Setup ethernet module");
    SPI2.setup({mosi:B15, miso:B14, sck:B13});
    eth = require("WIZnet").connect(SPI2, ethIrqPin);
    //eth.setIP({ip:"172.16.9.160", subnet:"255.255.0.0", gateway:"172.16.0.2", dns:"172.16.0.2"});
    eth.setIP();
    var addr = eth.getIP();
    logger(addr.toString());
    */

    // setup RFID module
    I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
    nfc = require("nfc").connect({i2c: I2C1, irqPin: rfidIrqPin});
    nfc.wakeUp(function(error) {
      if (error) {
        logger('RFID wake up error', error);
      } else {
        logger('RFID wake up OK');
        mdbRstPin.set();
        nfc.listen();
      }
    });

    // setup WiFi module
    Serial2.setup(115200, { rx: A3, tx : A2 });
    var wifi = require("ESP8266WiFi_0v25").connect(Serial2, function(err) {
      if (err) {
        logger("Error WiFi module connection");
        throw err;
      } else {
          wifi.reset(function(err) {
            if (err) {
                logger("Error WiFi module reset");
                throw err;
            }
            logger("Connecting to WiFi");
            wifi.connect(ssid, pass, function(err) {
              if (err) throw err;
              logger("Connected");
            });
          });
      }
    });
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
        if (typeof callback === 'function') {
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
        }, 1000);
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

initPeripherial();
startRFIDListening();
startSerialListening();
//sendWriteoffCommit();

/*
E.on('init', function() {
    initPeripherial();
    startRFIDListening();
    startSerialListening();
});
*/