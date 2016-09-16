var balance = "";
var isEnabled = true;
var isVendDone = true;
var isSessionTimeout = false;

var chip = "";
var deviceId = "1";
var writeoffId = "";
var successId = 1;
var srvid = 8633;
var product_price = 3000;
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
var isGetStateOK 		 = false;
var isWriteOffOK		 = false;
var isGetBalanceSent	 = false;
var isWriteOffV2Sent 	 = false;
var isWriteOffCommitSent = false;

var counterGetState = 0;
var counterWriteOff = 0;
var counterWriteOffComm = 0;
chip = "00112233445566778899AABBCCDDEEFF";

var getStateID = 0;
var writeOffID = 0;
var writeOffCommID = 0;
var SPORTLIFE_HOST = "sync.sportlifeclub.ru";
//var SPORTLIFE_HOST = "172.16.0.68";
var SPORTLIFE_STATIC_ADDR = {ip:"172.16.9.161", subnet:"255.255.0.0", gateway:"172.16.0.2", dns:"172.16.0.2"};

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

// 1 - getState
function getBalance(chipId, devId) {
	isGetStateOK = false;
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
	logger('(1) begin');
	var http = require("http");
	var timeoutID = setTimeout(function() {
		isVendDone = true;      // for listen RFID
        PIN_DEV_READY.reset();  // green led off
        counterGetState++;
        setTimeout(stress_test, 1000);
        logger("(1) for 5 sec");
	},5000);
	var req = http.request(options, function(res) {
		logger('(1) ok');
		var nRecv = 0;
		res.on('data', function(data) {
			nRecv += data.length;
			balance += data;
			//logger('Received data :: ' + balance);
		});
		res.on('close',function(data) {
			logger('(1) end: ' + balance);
			isGetStateOK = true;
			clearTimeout(timeoutID);
			//logger("Server connection closed, " + nRecv + " bytes received.");
			//logger("Response: " + balance);
			// send balance to MDB transport
			numBalance = parseInt(balance, 10);
			//logger("parseInt Result: " + numBalance);
			if(!isNaN(numBalance)) {
				if((numBalance/100) >= 30) { //user can start vend operation
                    //PIN_DEV_READY.set();  // green led on
					product_price = "3000";
					setBalance(deviceId, chip, srvid, product_price);
				} else {
					// not enought money
                    PIN_DEV_READY.reset();
					singleBlink(PIN_NOT_ENOUGHT_MONEY, 5000);
					//logger('Attention:: Not enought money');
                    isVendDone = true;
				}
			} else {
				processPesponse(balance);
				isVendDone = true;
			}
			isServerAvailable = true;
		});
        res.on('error',function(error) {
          console.log('***' + error);
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
            //PIN_DEV_READY.reset();
			singleBlink(PIN_CARD_NOT_REGISTERED, 5000);
		break;
		default:
			logger("Unknown Error HTTP-response");
		break;
	}
}

// REST: WriteOffV2 error responses
// 2 - WriteOffV2
function setBalance(devId, chip, srvid, price) {
	isWriteOffOK = false;
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
	logger('(2) begin');
	var timeoutID = setTimeout(function() {
		isVendDone = true; // for listen RFID
        counterWriteOff++;
        setTimeout(stress_test, 1000);
		logger("(2) for 5 sec");
	},5000);
	var http = require("http");
	http.request(options, function(res) {
		logger('(2) ok');
		var nRecv = 0;
		var Resp = "";
		res.on('data', function(data) {
			nRecv += data.length;
			Resp += data;
		});
		res.on('close',function(data) {
			isWriteOffOK = true;
			clearTimeout(timeoutID);
			//logger("Server connection closed, " + nRecv + " bytes received.");
			logger("(2) end: " + Resp);
			writeoffId = Resp;
			if (parseInt(writeoffId, 10) > 0 ) {
                PIN_DEV_READY.set();  // green led on
				Serial4.write("3000\n");  //fixed balance for SportLife (30RUB)
				//logger("Send 30RUB to nucleo");
                commitQueue[commitQueue.length] =
					"dev="+deviceId+
					"&chip="+chip+
					"&writeoffid="+writeoffId+
					"&success="+4; 
				writeOffCommit(commitQueue[0]);
			} else {
				//logger("WriteOffId <= 0");
				processPesponse(writeoffId);
				isVendDone = true;
			}
			isServerAvailable = true;
		});
        res.on('error',function(error) {
          console.log('***' + error);
        });
	}).end(content);
}


function writeOffCommit (sContent) {
	isServerAvailable = false;
	var content = sContent;
	if(typeof sContent === 'String') {/*logger("correct content type");*/}
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
	logger('(3) begin');
	var toID = setTimeout(function(){
		isVendDone = true; // for listen RFID
		counterWriteOffComm++;
        setTimeout(stress_test, 1000);
		logger("(3) for 5 sec");
	},5000);
	var http = require("http");
	http.request(options, function(res) {
		//logger("Request content: " + content);
		logger('(3) ok');
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
			logger("(3) end: " + Resp);
			if(Resp.toLowerCase() == 'ok') {
              
				//commitQueue.splice(0,1);
			}
            setTimeout(stress_test, 1000);
			isServerAvailable = true;
		});
        res.on('error',function(error) {
          console.log('***' + error);
        });
	}).end(content);
}

function singleBlink(led, timeout){
	led.set();
	setTimeout(function(led1){
		led1.reset();
	}, timeout, led);
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
    SPI2.setup({mosi:B15, miso:B14, sck:B13, baud:500000});
    eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
    //eth.setIP(SPORTLIFE_STATIC_ADDR);
    eth.setIP();
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
		}, 12000);
        nfc.listen();
      }
    });
}

/**/
//E.on('init', function() {
    initPeripherial();
    startRFIDListening();
    startSerialListening();
/*    setInterval(function(){
	  if(commitQueue.length > 0) {
		  writeOffCommit(commitQueue[0]);
	  } else {
		  logger("Queue is empty");
	  }
    }, 10000);
    */
//});
/**/

function testCommunication (){
	chip = "00112233445566778899AABBCCDDEEFF";
	getBalance(chip,deviceId);
	setTimeout(function(){
		if (isGetStateOK) {
			setBalance(deviceId, chip, srvid, product_price);
			setTimeout(function(){
				if (isWriteOffOK) {
					commitQueue[commitQueue.length] =
					"dev="+deviceId+
					"&chip="+chip+
					"&writeoffid="+writeoffId+
					"&success="+4; 
					writeOffCommit(commitQueue[0]);
				} else {
					counterWriteOff++;
					console.log("no response to writeOff");
				}
			},1500);
		} else {
			counterGetState++;
			console.log("no response to GetState");
		}
	},1500);
}

var isFlag = false;
setInterval(function(){
  isFlag = !isFlag;
  if(isFlag)
    LED1.set();
  else
    LED1.reset();
}, 500);

function stress_test() {
    if ((counterGetState + counterWriteOff + counterWriteOffComm)>=6){
      PIN_ETH_RST.reset();
      console.log("All sockets are waiting...");
      setTimeout(function(){
         PIN_ETH_RST.set();
         initPeripherial();
         console.log("PIN_ETH_RST.set()");
         counterGetState=0;
         counterWriteOff=0;
		 counterWriteOffComm=0;
         stress_test();
      },1000);
    } else {
      console.log(" ITERATION:: " + iteration);
      console.log(" counterGetState:: " + counterGetState);
	  console.log(" counterWriteOff:: " + counterWriteOff);
      console.log(" counterWriteOffComm:: " + counterWriteOffComm);
      iteration++;
      
      getBalance(chip,deviceId);
    }
}

var iteration = 0;
stress_test();

//var intId = setInterval(function() {
//  stress_test();
//},1000);
