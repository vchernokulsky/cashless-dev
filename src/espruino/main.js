var balance = "";
var curr_balance = "";
var bin_curr_balance = "";
var isPowerUp = false;
var isVendDone = true;
isSessionTimeout = false;
var chip = "";

// WIFI configuration
//var ssid = "neiron";
//var pass = "msp430f2013";

var ssid = "service";
var pass = "921249514821";

//var ssid = "VendexFree";
//var pass = "vendex2016";

// var ssid = "SauronAP";
// var pass = "yuwb3795";


// REST: GetState error responses
var ERR_CHIP_NUM = "ErrInvalidChipNum";
var ERR_UNEXPECTED_RESULT = "ErrInvalidResult";
var ERR_DEV_NAME = "ErrInvalidDeviceName";
var ERR_DEV_NOT_FOUND = "ErrDeviceOrClubNotFound";
var ERR_CHIP_NOT_FOUND = "ErrChipNotFound";
var ERR_CHIP_NOT_REG = "ErrChipNotRegistered";
function getBalance(chipUid) {
  balance = "";
  var numBalance = 0;
  //TODO: read chip id from RFID
  var content = "chip="+chipUid;
  var options = {
	host: 'sync.sportlifeclub.ru',
	port: '60080',
    path: '/slsrv/Chip/GetState',
    protocol: "http:",
    method: "POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Length":content.length
    }
  };
  console.log('Connectiong to Server ... ');
  var http = require("http");
  http.request(options, function(res) {
    console.log('Connected to Server');
    var nRecv = 0;
    res.on('data', function(data) {
      nRecv += data.length;
      balance += data;
    });
    res.on('close',function(data) {
      console.log("Server connection closed, " + nRecv + " bytes received.");
      console.log("Response: " + balance);
      // send balance to MDB transport
      numBalance = parseInt(balance, 10);
      if(!isNaN(numBalance)) {
        if((numBalance/100) > 30) { //user can start vend operation
          isVendDone = false;       //vend session started
          Serial4.write("3000\n");  //fixed balance for SportLife (30RUB)
          console.log("Send 30RUB to nucleo");
          // start timer for VEND session
          isSessionTimeout = true;          
          setTimeout(function(){
            if(isSessionTimeout) {
                console.log("SESSION TIMED OUT");
                isVendDone = true;   //vend session closed
                isSessionTimeout = false;
            }
          }, 40000);
        }
      } else {
        console.log("Recieved incorrect data");
      }
    });
  }).end(content);
}

// REST: WriteOff error responses
function setBalance(chip, srvid, price) {
  var content = "dev=1" + "&chip=" + chip + "&srvid=" + srvid + "&price=" + price;
  var options = {
	host: 'sync.sportlifeclub.ru',
	port: '60080',
    path: '/slsrv/chip/writeoff',
    protocol: "http:",
    method: "POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Length":content.length
    }
  };
  console.log('Connecting to Server ... ');
  var http = require("http");
  http.request(options, function(res) {
    console.log('Connected to Server');
    var nRecv = 0;
    var Resp = "";
    res.on('data', function(data) {
      nRecv += data.length;
      Resp += data;
    });
    res.on('close',function(data) {
      console.log("Server connection closed, " + nRecv + " bytes received.");
      console.log("Response: " + Resp);
    });
  }).end(content);
}

var PREFIX_LEN = 5;
function processTransportLayerCmd(cmd) {
    var prefix = cmd.substr(0, PREFIX_LEN);
    switch(prefix) {
      case 'PWRUP':          //PWRUP
        isPowerUp = true;
        isVendDone = true;
        console.log('PWRUP recieved');
        break;
      case 'PRICE':          //PRICE:<VALUE>
        srvid = 8633;
        price = (cmd.split(':'))[1];
        //TODO: set balance to SportLife server
        setBalance(chip, srvid, price);
        isVendDone = true;
        isSessionTimeout = false;
        console.log('PRICE recieved: ' + parseInt(price, 10)/100);
        break;
      case 'RESET':          //RESET
        isVendDone = true;
        console.log('RESET recieved');
        break;
      default:
        //just log message
        console.log('LOG: ' + cmd);
    }
}

var nfc = null;
function initPeripherial() {
    // setup serial for MDB transport communication
    Serial4.setup(115200);
    // setup RFID module

    I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
    nfc = require("nfc").connect({i2c: I2C1, irqPin: P9});
    nfc.wakeUp(function(error) {
      if (error) {
        print('RFID wake up error', error);
      } else {
        print('RFID wake up OK');
        // слушаем новые метки
        nfc.listen();
      }
    });
    
    // setup WiFi module
    /*
    Serial2.setup(115200, { rx: A3, tx : A2 });
    var wifi = require("ESP8266WiFi_0v25").connect(Serial2, function(err) {
      if (err) {
        console.log("Error WiFi module connection");
        throw err;
      } else {
          wifi.reset(function(err) {
            if (err) {
                console.log("Error WiFi module reset");
                throw err;
            }
            console.log("Connecting to WiFi");
            wifi.connect(ssid, pass, function(err) {
              if (err) throw err;
              console.log("Connected");
            });
          });
      }
    }); */
    
    // setup ethernet module
    console.log("Setup ethernet module");
    SPI2.setup({mosi:B15, miso:B14, sck:B13});
    eth = require("WIZnet").connect(SPI2, P10);   
    eth.setIP();
    //eth.setIP({ip: "192.168.1.110", subnet: "255.255.255.0", gateway: "192.168.1.1", dns: "8.8.8.8"});       
    var addr = eth.getIP();
    console.log(addr);
}

// mifare constants
var MIFARE_AUTH_TYPE = 0;
var RFID_BLOCK_NUM = 4;
var RFID_KEY = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
function readChipIdFromRFID(uid, keyData, block, callback) {
  var result = "error";
  nfc.authBlock(uid, block, MIFARE_AUTH_TYPE, keyData, function(error, msg) {
    if(error) {
      console.log('MSG: ' + msg);
      console.log('Block auth error');
    }
    else {
      nfc.readBlock(block, function(error, data) {
        if(error) {
          console.log('Block read error');
          console.log('MSG: ' + data);
        } else {
          //console.log('Block #' + block + ' data: ' + data);
          result = '';
          for(var i=0; i<data.length; i++) {
            ch1 = data[i].toString(16);
            ch2 = ch1.length > 1 ? ch1 : '0'+ch1;
            result += ch2;
          }
          chip = result;
          console.log('DATA: ' + result);
        }
        // try to get balance from server
        if (typeof callback === 'function') {
          callback(chip);
        }
      });
    }
  });
}

function startRFIDListening() {
// обработка взаимодействия с RFID меткой
    nfc.on('tag', function(error, data) {
      if (error) {
        print('tag read error');
      } else {
        console.log('RFID touched');
        //TODO: convert UID to correct chipid
        if (isPowerUp & isVendDone){
            console.log(data);    // UID и ATQA
            readChipIdFromRFID(data.uid, RFID_KEY, RFID_BLOCK_NUM, getBalance);
            // if (balance.length > 0) {
                // isVendDone = false; // rfid processing...
            // } else {
                // console.log("Balance IS NOT available");
            // }
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
          var lastIdx = buffer.indexOf('\n');
          if(lastIdx > 0) {
            command = buffer.substring(0, lastIdx);
            buffer = buffer.substring(lastIdx, buffer.length-1);
            processTransportLayerCmd(command);
          }
        }
    }, 5);
}

// initPeripherial();
// startRFIDListening();
// startSerialListening();

E.on('init', function() {
    initPeripherial();
    startRFIDListening();
    startSerialListening();
});