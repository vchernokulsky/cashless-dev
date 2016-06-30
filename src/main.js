var eth = null;

var sample_uid = new Array(67, 169, 193, 162);
var cur_uid = "";

var state = 0;
var states = {'NULL': 0, 'CARD_IN': 1, 'CARD_LOADED' :2};
var states1 = ['ACK','CIA','get_cash_balance','read_ok','card_loaded','return_card'];

var balance = "";
var curr_balance = "";
var bin_curr_balance = "";
var nibbles_str = ['0000','0001','0010','0011','01000000','01010000'];
var nibbles = [0,0,0,0,0,0];
var nibble_index = 0;

function setupEnv() {
  // setup serial port
  Serial4.setup(9600);
  setupEthernet();
}

function setupRFID(){
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
  return nfc;
}

function setupEthernet (){
  // setup ethernet module
  SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  eth = require("WIZnet").connect(SPI2, B10);
  //eth.setIP();
  eth.setIP({ip: "172.18.29.54", subnet: "255.255.224.0", gateway: "172.18.0.1", dns: "172.18.0.1"});
}

setupEnv();
console.log('setup OK');
state = states.NULL;
console.log(' 0--> State: ' + state);


function getState() {
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
      balance = data;
      //console.log(' 0... balance value',balance);
    });
    res.on('close',function(data) {
      console.log("Server connection closed, " + nRecv + " bytes received");
    });
  }).end(content);
}

function check_chipid (d, uid) {
  var compare = 0;
  var length_1 = d.length;
  var length_2 = uid.length;

  if (length_1 == length_2){
    for (var i = 0; i < length_1; i++){
      if (d[i] == uid[i]){
        compare += 1;
      }
    }
    if (compare == length_1){
     return true;
    }
  }
  return false;
}

function processMessage(msg) {
  switch(state) {
    case states.NULL:
      console.log('State NULL');
      Serial4.write([0]);
      break;
    case states.CARD_IN:
      console.log('State CardIn');
      processCardIn(msg);
      break;
    case states.CARD_LOADED:
      console.log('State CardLoaded');
      processCardLoaded(msg);
      break;
  }
}

var balance = 0;
function processCardIn(msg) {
  console.log('processCardIn');
  switch(msg) {
    case '71':
      Serial4.write([1]);
      console.log('CardIn 0x71');
      break;
    case '72':
      Serial4.write([0]);
      console.log('CardIn 0x72');
      // получить баланс
      if (ready_nibbles()){
        state = states.CARD_LOADED;
      }
      console.log(' 3--> State: ' + state);
      break;
  }
}

function processCardLoaded(msg) {
  console.log('processCardLoaded');
  switch(msg) {
    case '71':
      Serial4.write([2]);
      console.log('CardLoaded 0x71');
      console.log(' ==> Nibbles :: ', nibbles);
      break;
    case '73':
      console.log('CardLoaded 0x73');
      console.log(' ==> Nibbles :: ', nibbles);
      if (ready_nibbles()){
        console.log(' ==> Nibble to send :: ', nibbles[nibble_index]);
        Serial4.write(nibbles[nibble_index]);
        console.log(' ==> Sended nibble :: ', nibbles[nibble_index]);
        nibble_index++;
      }
      break;
    case '7F':
      console.log('CardLoaded 0x7F');
      // отправить предыдущий data nibble (если был ParityError)
      // повторить передачу данных с начала (если был СhecksumError)
      break;
  }
}

function ready_nibbles(){
  var i = 0, check = 0;
  for (i = 0; i < nibbles.length; i++){
    if (nibbles[i] !== 0){
      check++;
    }
  }
  if (check == nibbles.length){
    return true;
  } else {
    return false;
  }
}

// обработка команд EXECUTIVE устройства
Serial4.on('data', function (data) {
  // выводим код запроса от EXEC в консоль
  console.log("<MSG>: " + data.charCodeAt(0).toString(16));
  var comand = data.charCodeAt(0).toString(16);
  processMessage(comand);
});


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
// обработка взаимодействия с RFID меткой
nfc.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
    nibble_index = 0;
    updateNibbles();
    console.log(' ------ ');
    console.log(data);    // UID и ATQA
    cur_uid = data.uid;
    state = states.CARD_IN;
    if (check_chipid(sample_uid,cur_uid)){
      console.log('>> Chipid detected ... ');
      getState();
      if (balance !== 0){
        formigNibblesToSend();
        console.log(' ..> Nibbles :: ', nibbles);
      }
    } else {
      console.log('>> Chipid not registered ... ');
    }
    if (ready_nibbles()){
      console.log(' 2--> State: ' + state);
    }
    // каждые 1000 миллисекунд слушаем новую метку
    setTimeout(function () {
      nfc.listen();
    }, 1000);
  }
});

function updateNibbles(){
  nibbles_str = ['0000','0001','0010','0011','01000000','01010000'];
  nibbles = [0,0,0,0,0,0];
}

function formigNibblesToSend(){
  if (balance >= 650){
    curr_balance = 65000;
    bin_curr_balance = parseInt(curr_balance, 10).toString(2);
  } else {
    curr_balance = balance;
    alignBinBalanceTo16();
  }
  makeNibbleStr();
  makeNibbleInt();
  console.log(' ===> Nibbles ready to send:: ', nibbles);
}

function alignBinBalanceTo16(){
  var i = 0;
  for (i = 0; i <= 15 && bin_curr_balance.length <= 15; i++){
    bin_curr_balance = "0" + bin_curr_balance;
  }
}

function makeNibbleStr(){
  var i = 0, j = 0, k = 0;
  //console.log(' --> bin_curr_balance = ', bin_curr_balance);
  //console.log(' -->           length = ', bin_curr_balance.length);
  for (i = 0, k = 0; i < bin_curr_balance.length & k <=3; i++){
    for (j = 0; j <=3; j++){
      nibbles_str[k] += bin_curr_balance[i+j];
    }
    //console.log(' --> nibbles_str[',k,'] = ',  nibbles_str[k]);
    i = i+(j-1);
    k++;
  }
}

function makeNibbleInt(){
  var i = 0;
  for (i = 0; i < nibbles_str.length; i++){
    nibbles[i] = parseInt(nibbles_str[i], 2);
  }
}
