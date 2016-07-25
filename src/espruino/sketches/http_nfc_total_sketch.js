var chip = "";
var balance = "";
var page2read = 0;
//var ssid = "service";
//var pass = "921249514821";
var page3data, page4data, page5data, isReadDone = false;


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

function getBalance(chipid) {
  balance = "";
  //TODO: read chip id from RFID
  var content = "chip="+chipid;
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
    if (!isReadDone){
      nfc.readPage(page2read, function(error, buffer) {
        if(error) {
          console.log('page ' + page2read + ' read error');
        } else {
          // печатаем результат чтения байт данных
          console.log('page ' + page2read + ' read result: ', buffer);
          if (page2read == 5){
            page3data = buffer;
          }
          if (page2read == 6){
            page4data = buffer;
          }
          if (page2read == 7){
            page5data = buffer;
            isReadDone = true;
          }
        }
      });
      page2read++;
    }
    if (isReadDone){
      chip = (makeChipidByRFID(page3data) + makeChipidByRFID(page4data) + makeChipidByRFID(page5data)).substring(0,18);
      console.log(" Chipid from RFID: " + chip);
      getBalance(chip);
    }
  }
  // каждые 1000 миллисекунд слушаем новую метку
  setTimeout(function () {
    nfc.listen();
  }, 1000);
});
 
// Наблюдаем за кнопкой
// списание услуги из баланса по нажатию кнопки 
setWatch(function(e) {
  //chip = "011000000168435012";
  srvid = "8633";
  price = "100"; // 1RUB
  console.log(' ---- ');
  setBalance(chip, srvid, price);
}, BTN1, {
  repeat: true,
  edge: 'falling',
  debounce: 10
});

function makeChipidByRFID(buffer){
  var result = "";
  for (var i = 0; i < buffer.length; i++){
    result = result + makeElemToArray(buffer[i] % 100);
  }
  return result;
}

function makeElemToArray(elem){
  var res = "";
  if (elem === 0){
    res = "00";
    return res;
  }
  if (Math.floor(elem/10) === 0){
       res = "0" + elem;
  } else {
    res += elem;
  }
  return res;
}
function chipidToArray(chipid){
  var i = 0;
  var array = ["000","000","000","000","000","000","000","000"];
  for (i = 0; i < Math.floor(chipid.length / 3); i++){
    array[i] = chipid[3*i].toString() + chipid[1+3*i].toString()+chipid[2+3*i].toString();
  }
  return array;
}