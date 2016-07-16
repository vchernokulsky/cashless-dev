var balance = "";
var curr_balance = "";
var bin_curr_balance = "";
var isPowerUp = false;
var isVendDone = true;
var chip = "";

// WIFI configuration
var ssid = "neiron";
var pass = "msp430f2013";

// function setupEthernet (){
  // // setup ethernet module
  // SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  // eth = require("WIZnet").connect(SPI2, B10);
  // //eth.setIP();
  // eth.setIP({ip: "172.18.29.54", subnet: "255.255.224.0", gateway: "172.18.0.1", dns: "172.18.0.1"});
// }

Serial2.setup(115200, { rx: A3, tx : A2 });
var wifi = require("ESP8266WiFi_0v25").connect(Serial2, function(err) {
  if (err) {
    console.log("Error WiFi module connection");
    throw err;
  } else {
      wifi.reset(function(err) {
        if (err) {
            console.log("Error WiFi module rset");
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

Serial4.setup(115200);

function getBalance(chipUid) {
  balance = "";
  //var content = "chip=" + chipUid;  
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
  console.log('Connectiong to Server ... ');
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




var CMD_LEN = 16;
var command = '';
var CMD_LEN = 16;
var command = '';
setInterval(function() {
  if(Serial4.available() >= CMD_LEN) {
    command = Serial4.read(CMD_LEN);
    console.log('comman::' + command);
    // process command
    var prefix = command.substr(0, 7);
    switch(prefix) {
      case 'POWERUP':
        isPowerUp = true;
        isVendDone = true;        
        console.log('POWERUP recieved');
        break;
      case '__PRICE':
        //chip = 
        srvid = 8633;
        price = command.substr(8, 8);
        setBalance(chip, srvid, price);
        isVendDone = true;
        console.log('__PRICE recieved: ' + price);
        break;
      case '__RESET':
        isVendDone = true;
        console.log('__RESET recieved');
        break;
      default:
        console.log("Incorrect command recieved");
        command = '';
    }
    command = '';
  }
}, 5);

// setup RFID module
I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
// подключаем модуль к I2C1 и пину прерывания
var nfc = require("nfc").connect({i2c: I2C1, irqPin: P9});
nfc.wakeUp(function(error) {
  if (error) {
    print('RFID wake up error', error);
  } else {
    print('RFID wake up OK');
    // слушаем новые метки
    nfc.listen();
    }
});
// обработка взаимодействия с RFID меткой
nfc.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
    console.log(' ------ ');
    console.log(data);    // UID и ATQA
    // TODO: convert UID to correct chipid
    if (isPowerUp & isVendDone){
        chip = data.uid;
        getBalance(data.uid);
        isVendDone = false; // rfid processing...
    }
    setTimeout(function () {
      nfc.listen();
    }, 1000);
  }
});

function sendBalance(aBalance){
    Serial2.write(aBalance1);
}

function alignBinBalanceTo16(){
  var i = 0;
  for (i = 0; i <= 15 && bin_curr_balance.length <= 15; i++){
    bin_curr_balance = "0" + bin_curr_balance;
  }
}