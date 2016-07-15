var eth = null;

function setupEthernet() {
  SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  eth = require("WIZnet").connect(SPI2, B10);
  //eth = require("WIZnet").connect();
  //eth.setIP();
  eth.setIP({ip: "172.18.29.54", subnet: "255.255.224.0", gateway: "172.18.0.1", dns: "172.18.0.1"});
}

function getState() {
  var content = "chip=011000000168435012";
  var options = {
	host: 'sync.sportlifeclub.ru',
	port: '60080',
    path: '/slsrv/Chip/GetState',
    protocol: "http:",
    method: "POST",
    headers:{
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Length":content.length
    }
  };

  console.log('Connectiong to Server ... ');
  require("http").request(options, function(res) {
    console.log('Connected to Server');
    var nRecv = 0;
    res.on('data', function(data) {
      nRecv += data.length;
      console.log(data);
    });
    res.on('close',function(data) {
           console.log("Server connection closed, " + nRecv + " bytes received");
           console.log(data);
   });
  }).end(content);
}

// настраиваем I2C1 для работы модуля
I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});

// подключаем модуль к I2C1 и пину прерывания
var nfc = require("nfc").connect({i2c: I2C1, irqPin: P9});

// активируем модуль
nfc.wakeUp(function(error) {
  if (error) {
    print('wake up error', error);
  } else {
    print('wake up OK');
    // слушаем новые метки
    nfc.listen();
  }
});

nfc.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
  // выводим в консоль полученные данные
  // UID и ATQA
  console.log(' ---- ');
  console.log(data);

  // проверка UID
  // если UID соответствует chipid, то сделать http-запрос
  var mas2 = data.uid;
  // допустим, наш chipid закреплен за следующим UID:
  var mas1 = new Array(67, 169, 193, 162);

  var compare = 0;
  var length_1 = mas1.length;
  var length_2 = mas2.length;

  if (length_1 == length_1){
    for (var i = 0; i < length_1; i++){
      if (mas1[i] == mas2[i]){
        compare += 1;
      }
    }
    if (compare == length_1){
      console.log(' chipid detected ... ');
      // можно посылать запрос
      // сперва установим соединение
      setupEthernet();
      var ip = eth.getIP();
      //console.log(ip);
      getState();
    }
  }

  // каждые 1000 миллисекунд слушаем новую метку
  setTimeout(function () {
    nfc.listen();
  }, 1000);
  }
});