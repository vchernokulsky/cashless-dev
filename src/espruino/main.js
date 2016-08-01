var balance = "";
var curr_balance = "";
var bin_curr_balance = "";
var isPowerUp = false;
var isVendDone = true;
var chip = "";

// WIFI configuration
//var ssid = "neiron";
//var pass = "msp430f2013";
var ssid = "service";
var pass = "921249514821";

// function setupEthernet (){
  // // setup ethernet module
  // SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  // eth = require("WIZnet").connect(SPI2, B10);
  // //eth.setIP();
  // eth.setIP({ip: "172.18.29.54", subnet: "255.255.224.0", gateway: "172.18.0.1", dns: "172.18.0.1"});
// }

// serial for MDB transport communication
Serial4.setup(115200);
function getBalance(chipUid) {
  balance = "";
  //TODO: read chip id from RFID
  var content = "chip=011000000168435012";
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
      Serial4.write(balance + "\n");
    });
  }).end(content);
}

function setBalance(chip, srvid, price) {
  var content = "chip=" + chip + "&srvid=" + srvid + "&price=" + price;
  var options = {
	host: 'sync.sportlifeclub.ru',
	port: '60080',
    path: '/slsrv/clients/writeoff',
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
        var chip = "011000000168435012";
        setBalance(chip, srvid, price);
        setTimeout(function(){
            isVendDone = true;
        }, 30000);
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
    });
}

function startRFIDListening() {
// обработка взаимодействия с RFID меткой
    nfc.on('tag', function(error, data) {
      if (error) {
        print('tag read error');
      } else {
        console.log('RFID touched');
        //setBalance("011000000168435012", "8633", "1000");        
        //TODO: convert UID to correct chipid
        if (isPowerUp & isVendDone){
            console.log(data);    // UID и ATQA        
            chip = data.uid;
            getBalance(data.uid);
            if (balance.length > 0) {
                isVendDone = false; // rfid processing...
            } else {
                console.log("Balance IS NOT available");
            }
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

function initialize() {
    initPeripherial();
    startRFIDListening();
    startSerialListening();
}
 
//program entry point
E.on('init', function() {
    initialize();
});