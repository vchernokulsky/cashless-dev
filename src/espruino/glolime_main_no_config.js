var nfc = null;
var balance = "";

var isEnabled = false;
var isVendDone = true;

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
var HOST = "192.168.0.100";
var NETWORK_CONFIG = {mac: "56:44:58:0:0:05", ip: "192.168.0.201", subnet: "255.255.255.0", gateway: "192.168.0.1", dns: "192.168.0.1"};
var HOST_PING_TIMEOUT = 25000;

function logger(msg) {
    console.log(msg);
}

var ERROR_OK                = 0x00,
    ERROR_INVALID_CRC       = 0xFF,
    ERROR_INVALID_COMMAND   = 0xFE,
    ERROR_INVALID_PARAMETER = 0xFD,

	ERROR_INSUFFICIENT_FUNDS   = 0xFB,
	ERROR_NON_EXISTENT_PRODUCT = 0XFA,
	ERROR_NON_EXISTENT_USER    = 0XF9,
	ERROR_NON_EXISTENT_SALE    = 0xF8,
	ERROR_NOT_REGISTERED_CARD  = 0xFC;


// for CRC16_X25 calculation
var crc = 'undefined';

// params to getBalance()
var cardType = 0x01,
    cardUID = [],
    str_user_id = '0'; // returns GetBalance()

// For communications
var client,
    wifi;

// For setting communication
var isRFIDOk  = false;
var isWiFiOk  = false;

// For setInterval to check WiFi and RFID/NFC
var idWiFi, idRFID;

// NetWork Configurator
var configurator = 'undefined';

// Glolime commubications
var golime = 'undefined';

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

function processSell(error, data){
  logger(":: Process SELL PRODUCT");
  logger("ERROR CODE: " + error);
}

function processBalance(error, data){
  logger(":: Process GET BALANCE");
  logger("ERROR CODE: " + error);
  if(error === 0) {
    logger("USER ID: " + data.userId);
    str_user_id = data.userId;
    logger("USER TYPE: " + data.userType);
    logger("BALANCE: " + data.balance);
    if(!isNaN(data.balance)) {
        if (data.balance >= 2500) {
            var balanceToSend = (data.balance).toString(10)+"\n";
            logger("BALANCE TO STM: " + balanceToSend);
            //TODO: change to balance ACK
            Serial4.write(balanceToSend);
            _internalCommTimeout = setTimeout(function(){
                logger('ERROR: Balance ACK timeout');
                if (_vendBlinkerInterval != 'undefined'){
                   stopBlinker(_vendBlinkerInterval);
                   _vendBlinkerInterval = 'undefined';
                }
                enableDevice();
            }, 2000);
        } else {
            logger("ATTENTION:: Not enought money");
            if (_vendBlinkerInterval != 'undefined'){
                stopBlinker(_vendBlinkerInterval);
                _vendBlinkerInterval = 'undefined';
            }
            singleBlink(PIN_NOT_ENOUGHT_MONEY, 5000);
        }
    } else {
        logger("Recieved incorrect data: " + numBalance);
        if (_vendBlinkerInterval != 'undefined'){
            stopBlinker(_vendBlinkerInterval);
            _vendBlinkerInterval = 'undefined';
        }
        enableDevice();
    }
  } else {
      if (_vendBlinkerInterval != 'undefined'){
          stopBlinker(_vendBlinkerInterval);
          _vendBlinkerInterval = 'undefined';
      }
      enableDevice();
      switch (error){
          case 241:
              PIN_ETH_RST.reset();
              logger("reset ETH_RST pin");
              /* 
              setTimeout(function() {
                logger("set ETH_RST pin");
                PIN_ETH_RST.set();
                glolime.getBalance(cardType, cardUID, processBalance);
              }, 3000);
              */
              break;
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
  }
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
        var str_product_id = array[1];
        var str_product_price = array[2];
		logger('VEND INFO | PRODUCT ID: ' + str_product_id + '   PRODUCT PRICE: ' + parseInt(str_product_price, 10)/100);
		/*
        product_id = uintToByteArray(parseInt(str_product_id, 10)+1);
		product_price = uintToByteArray(parseInt(str_product_price, 10));
		//======================ExtSrv
		var msg = [], msg_str = "";
    	msg = makeGloLimeRespArray(0x01, frameId, 0x02, makeCmdDataToBuy(userIdLittleEndian, product_id, product_price));
		sendMsgToGloLime(msg);
        frameId++; //<--??
        */
        glolime.sellProduct(str_product_id, str_product_price, str_user_id, processSell);
        break;
      case 'CANCEL':          //CANCEL:\n
        if (_vendBlinkerInterval != 'undefined'){
            stopBlinker(_vendBlinkerInterval);
            _vendBlinkerInterval = 'undefined';
        }
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
function startRFIDListening() {
	nfc.on('tag', function(error, data) {
        logger("Failures count:" + _failuresCount);
		if (error) {
			print('tag read error');
            //TODO: nfc reader reinitialization
            reset();
            load();
		} else {
            logger('isEnabled: ' + isEnabled + '   isVendDone: ' + isVendDone);
            if (isEnabled && isVendDone){
              isVendDone = false;       //vend session started
              _vendBlinkerInterval = startBlinker(PIN_DEV_READY, 500);
              /*
              uidToSend = processUidToSend(data.uid);
              var msg = [], msg_str = "";
    		  msg = makeGloLimeRespArray(0x01, frameId, 0x01, makeCmdDataToGetBalance(0x01, uidToSend));
              sendMsgToGloLime(msg); // TODO: ExtSrv
              frameId++;
              userIdLittleEndian = [];
              */
              cardUID = data.uid;
              cardType = 0x01;
              logger("CARD UID: " + cardUID);
              glolime.getBalance(cardType, cardUID, processBalance);
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
    logger("! Starting NFC module");
    // waiting for RFID wake up
    idRFID = setInterval(function () {
      if (!isRFIDOk){
        // wake up rfid
        logger("-> isRFIDOk = " + isRFIDOk);
        nfc.wakeUp(function(error){
          if (error) {
            print('RFID wake up error', error);
            reset();
            load();
          } else {
              print('RFID wake up OK');
              isRFIDOk = true;
              logger('Clear interval RFID...');
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
    logger("... network configuration ... ");
    var flash = require('Flash');
    if (configurator == 'undefined') {
      configurator = require("configurator").create();
      configurator.setup(flash);
    }
    var result = -1;//configurator.loadNetworkConfig();
    switch (result) {
      case 0:
        logger("Network Config Loaded from Flash");
        logger("CODE:" + result);
        logger("HOST: " + configurator.getHost());
        logger("NETWORK CONFIG:");
        logger(configurator.getNetworkConfig());
        break;
      default:
        logger("ERROR:: Network Config Load: " + result);
        break;
    }
    logger("... peripherial initialising ... ");
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
    logger("... glolime communication ... ");
    glolime = require("CommGlolime").create();
    glolime.setup(client, HOST, crc, p);
    initNfcModule(nfc);
    setTimeout(function(){
      PIN_MDB_RST.set();
      logger('MDB SET');
	}, 12000);
}


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

    if (configurator == 'undefined'){
      configurator = require("configurator").create();
      configurator.setup(flash);
    }
    var result = configurator.saveNetworkConfig(cmdSerial6);
    switch (result){
      case 0:
        logger("Network Config Saved in Flash");
        reset();
        load();
        enableDevice();
        break;
      default:
        logger("ERROR:: Network Config Safe: " + result);
        break;
    }
  }
});


//E.on('init', function() {
  E.enableWatchdog(10, true);
  process.on('uncaughtException', function() {
    logger('Uncaught Exception!!!');
    reset();
    load();
  });
  blinkCarousel();
  initialize();
//});