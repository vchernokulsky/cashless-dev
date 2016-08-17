// WIFI configuration

var ssid = "SauronAP";
var pass = "yuwb3795";

var balance = "";

var chip = "00112233445566778899aabbccddeeff";

function logger(msg) {
  console.log(msg);
}

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
  console.log('Connecting to Server ... ');
  var http = require("http");
  http.request(options, function(res) {
    console.log('Connected to Server');
    var nRecv = 0;
    res.on('data', function(data) {
      nRecv += data.length;
      balance += data;
    });
    res.on('close',function(data) {
        console.log(balance);
      // console.log("Server connection closed, " + nRecv + " bytes received.");
      // console.log("Response: " + balance);
      // // send balance to MDB transport
      // numBalance = parseInt(balance, 10);
      // if(!isNaN(numBalance)) {
        // if((numBalance/100) > 30) { //user can start vend operation
          // isVendDone = false;       //vend session started
          // Serial4.write("3000\n");  //fixed balance for SportLife (30RUB)
          // console.log("Send 30RUB to nucleo");
          // // start timer for VEND session
          // isSessionTimeout = true;          
          // setTimeout(function(){
            // if(isSessionTimeout) {
                // console.log("SESSION TIMED OUT");
                // isVendDone = true;   //vend session closed
                // isSessionTimeout = false;
            // }
          // }, 40000);
        // }
      // } else {
        // console.log("Recieved incorrect data");
      // }
    });
  }).end(content);
}

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
logger("Setup ethernet module");
SPI2.setup({mosi:B15, miso:B14, sck:B13});
eth = require("WIZnet").connect(SPI2, P10);
eth.setIP({ip:"172.16.9.160", subnet:"255.255.0.0"});
var addr = eth.getIP();
logger(addr);

setInterval(function(){getBalance(chip);}, 3000);

/*
setWatch(function(e) {
  getBalance(chip);
}, BTN1, {
  repeat: true,
  edge: 'falling',
  debounce: 10
});*/