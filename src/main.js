var eth = null;

function setupEnv() {
    // setup serial port
    Serial4.setup(9600);
    
    // setup ethernet module
    SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
    eth = require("WIZnet").connect(SPI2, B10);
    eth.setIP();
//  eth.setIP({ip: "172.18.29.54", subnet: "255.255.224.0", gateway: "172.18.0.1", dns: "172.18.0.1"});    

    // setup RFID module
    I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});    
    // подключаем модуль к I2C1 и пину прерывания
    var nfc = require("nfc").connect({i2c: I2C1, irqPin: P9});
    nfc.wakeUp(function(error) {
      if (error) {
        print('wake up error', error);
      } else {
        print('wake up OK');
        // слушаем новые метки
        nfc.listen();
      }
    });    
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

// типа "global" переменные
var CIA = false; // карта не приложена к ридеру
var CARDLOADED = false; // отстаток на счете не известен

// обработка команд EXECUTIVE устройства
Serial4.on('data', function (data) {
  // выводим код запроса от EXEC в консоль	
  console.log("<MSG>: " + data).charCodeAt(0).toString(16);
  
  if (CIA){
	  // карта приложена к ридеру
	  Serial4.write([1]);
	  if (CARDLOADED){
		  // известен остаток, сообщить EXEC
		  Serial4.write([2]);
	  }
  }  else{
	  // карта не приложена, остаток не известен
	  // Отвечаем EXEC'у НУЛЕМ
	  Serial4.write([0]);
  } 
});

// обработка взаимодействия с RFID меткой
nfc.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
  // карта приложена к ридеру
  CIA = true;
  	 
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
	  // узнали остаток на счете -> сообщаем серверу
	  CARDLOADED = true;
    }
  }
 
  // каждые 1000 миллисекунд слушаем новую метку
  setTimeout(function () {
    nfc.listen();
  }, 1000);
  }
});
