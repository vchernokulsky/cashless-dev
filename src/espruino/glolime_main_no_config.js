var nfc = null;
var balance = "";

var isEnabled = false;
var isVendDone = true;

var _failuresCount = 0;

var _serialInterval = 'undefined';
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
var HOST = "192.168.1.100";
var NETWORK_CONFIG = {mac: "56:44:58:0:0:05", ip: "192.168.1.201", subnet: "255.255.255.0", gateway: "192.168.1.1", dns: "192.168.1.1"};
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
var client, wifi;

// For setting communication
var isRFIDOk  = false;
var isWiFiOk  = false;

// For setInterval to check WiFi and RFID/NFC
var idWiFi, idRFID;

// NetWork Configurator
var configurator = 'undefined';

// Glolime commubications
var golime = 'undefined';

// Indication module
var indication = 'undefined';

function processTransportLayerCmd(cmd) {
    var array = cmd.split(':');
    var prefix = array[0];
    switch(prefix) {
      case 'BALANCE':
        logger('Balance ACK recieved');
        break;
      case 'ENABLE':          //ENABLE:\n
        indication.stopCarousel();
        isEnabled = true;
        isVendDone = true;
        indication.enableDevice();
        logger('ENABLE recieved');
        break;
      case 'DISABLE':       //DISABLE:\n
        isEnabled = false;
        isVendDone = true;
        indication.disableDevice();
        logger('DISABLE received');
        break;
      case 'VEND':          //VEND:<PRODUCT ID>:<PRODUCT PRICE>\n
        var str_product_id = array[1];
        var str_product_price = array[2];
		logger('VEND INFO | PRODUCT ID: ' + str_product_id + '   PRODUCT PRICE: ' + parseInt(str_product_price, 10)/100);
        glolime.sellProduct(str_product_id, str_product_price, str_user_id);
        break;
      case 'CANCEL':          //CANCEL:\n
        _vendBlinkerInterval = indication.stopBlinker(_vendBlinkerInterval);
        isEnabled = true;
        isVendDone = true;
		indication.enableDevice();
        logger('CANCEL recieved');
        break;
      default:
        //FIXME: change to balance ACK message
        if(cmd.length <=10 ) {
          var respInt = parseInt(cmd, 10);
          if(!isNaN(respInt)) {
			_internalCommTimeout = indication.stopBlinker(_internalCommTimeout);
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
              _vendBlinkerInterval = indication.startBlinker(PIN_DEV_READY, 500);
              cardUID = data.uid;
              cardType = 0x01;
              logger("CARD UID: " + cardUID);
              glolime.getBalance(cardType, cardUID);
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

var cmdSerial6 = "";
var bufferSerial6 = "";
Serial6.setup(115200);
Serial6.on('data', function(data) {
  isEnabled = false;
  indication.failureDevice();
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
        isEnabled = true;
        isVendDone = true;
        indication.enableDevice();
        break;
      default:
        logger("ERROR:: Network Config Safe: " + result);
        break;
    }
  }
});

function initialize() {
  // Indication setup
  indication = require("indication").create();
  indication.setup(PIN_DEV_READY, PIN_NOT_ENOUGHT_MONEY, PIN_CARD_NOT_REGISTERED);
  indication.blinkCarousel();
  logger("... network configuration ... ");
  var flash = require('Flash');
  if (configurator == 'undefined') {
    configurator = require("configurator").create();
    configurator.setup(flash);
  }
  var result = /*-1;/*/configurator.loadNetworkConfig();
  switch (result) {
    case 0:
      logger("Network Config Loaded from Flash");
      logger("CODE:" + result);
      logger("HOST: " + configurator.getHost());
      HOST = configurator.getHost();
      logger("NETWORK CONFIG:");
      logger(configurator.getNetworkConfig());
      NETWORK_CONFIG = configurator.getNetworkConfig();
      break;
    default:
      logger("ERROR:: Network Config Load: " + result);
      break;
  }
  logger("... peripherial initialising ... ");
  PIN_MDB_RST.reset();
  indication.resetPIN(PIN_DEV_READY);
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
  subscribeGlolimeEvents();
  initNfcModule(nfc);
  setTimeout(function(){
    PIN_MDB_RST.set();
    logger('MDB SET');
  }, 12000);
}

function subscribeGlolimeEvents() {
  glolime.on('sell',function(data){
    logger(":: Process SELL PRODUCT");
    logger("ERROR CODE: " + data.message);
  });

  glolime.on('balance',function(data){
    logger(":: Process GET BALANCE");
    logger("ERROR CODE: " + data.message);
    if(data.message === 0) {
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
                  _vendBlinkerInterval = indication.stopBlinker(_vendBlinkerInterval);
                  isEnabled = true;
                  isVendDone = true;
                  indication.enableDevice();
              }, 2000);
          } else {
              logger("ATTENTION:: Not enought money");
              _vendBlinkerInterval = indication.stopBlinker(_vendBlinkerInterval);
              indication.singleBlink(PIN_NOT_ENOUGHT_MONEY, 5000);
          }
      } else {
          logger("Recieved incorrect data: " + numBalance);
          _vendBlinkerInterval = indication.stopBlinker(_vendBlinkerInterval);
          isEnabled = true;
          isVendDone = true;
          indication.enableDevice();
      }
    } else {
        _vendBlinkerInterval = indication.stopBlinker(_vendBlinkerInterval);
        isEnabled = true;
        isVendDone = true;
        indication.enableDevice();
    }
  });

  glolime.on('error', function(data) {
    switch (data.message){
      case 241:
        isVendDone = true;
        logger("Timeout Error");
        break;
      case ERROR_INVALID_CRC:
        logger('ERROR: CRC incorrect');
        isVendDone = true;
        break;
      case ERROR_INVALID_COMMAND:
        logger('ERROR: Cmd incorrect');
        break;
      case ERROR_INVALID_PARAMETER:
        logger('ERROR: Cmd parament incorrect');
        break;
      case ERROR_INSUFFICIENT_FUNDS:
        logger('ERROR: INSUFFICIENT FUNDS ');
        indication.singleBlink(PIN_NOT_ENOUGHT_MONEY,5000);
        break;
      case ERROR_NON_EXISTENT_PRODUCT:
        logger('ERROR: PRODUCT DOES NOT EXIST');
        break;
      case ERROR_NON_EXISTENT_USER:
        logger('ERROR: USER DOES NOT EXIST');
        break;
      case ERROR_NON_EXISTENT_SALE:
        logger('ERROR: SALE DOES NOT EXIST');
        break;
      case ERROR_NOT_REGISTERED_CARD:
        logger('ERROR: CARD DOES NOT REGISTERED');
        indication.singleBlink(PIN_CARD_NOT_REGISTERED, 5000);
        break;
      default:
        logger('Unknown comand exit code:\n');
        logger(data.message);
        break;
    }
  });
}

E.on('init', function() {
  E.enableWatchdog(10, true);
  process.on('uncaughtException', function() {
    logger('Uncaught Exception!!!');
    reset();
    load();
  });
  initialize();
});