var chip = "";
var balance = "";
//var ssid = "service";
//var pass = "921249514821";

var ssid = "Nexus777";
var pass = "nata1111";

var nfc = null;

// serial for wifi commuinication
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
    });
  }).end(content);
}

function setBalance(chip, srvid, price) {
  var content = "chip=" + chip + "&srvid=" + srvid + "&price=" + price;
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

// настраиваем I2C1 для работы модуля
I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
nfc = require("nfc").connect({i2c: I2C1, irqPin: P9});
nfc.wakeUp(function(error) {
  if (error) {
    print('wake up error', error);
  } else {
    print('wake up OK');
    nfc.listen();
  }
});

nfc.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
	console.log(' ---- ');
	console.log(data);
    console.log(' ---- ');
	getBalance();
  }
// каждые 1000 миллисекунд слушаем новую метку
  setTimeout(function () {
    nfc.listen();
  }, 1000);
});
  
// Наблюдаем за кнопкой
// списание услуги из баланса по нажатию кнопки 
setWatch(function(e) {
  chip = "011000000168435012";
  srvid = "8633";
  price = "100"; // 1RUB
  console.log(' ---- ');
  setBalance(chip, srvid, price);
}, BTN1, {
  repeat: true,
  edge: 'falling',
  debounce: 10
});

