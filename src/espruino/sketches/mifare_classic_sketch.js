I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});

// подключаем модуль к I2C1 и пину прерывания
var nfc = require('nfc_new').connect({i2c: I2C1, irqPin: P9});

// указываем страницу для чтения данных
var page2read = 5;
//var keyData = [0x73, 0x75, 0x70, 0x65, 0x72, 0x33];
var mifareKey = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
var blockNumber = 0;
var isReadyListen = false;

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

function getHexStr(data) {
  var str = '';
  for(var i=0; i<data.length; i++) {
    str += ('0x' + data[i].toString(16) + ' ');
  }
  return str;
}


var MIFARE_AUTH_TYPE = 0;
function readMifareClassic(uid, keyData, blockNum) {
  console.log('readMifareClassic UID: ' + getHexStr(uid));
  nfc.authBlock(uid, blockNum, MIFARE_AUTH_TYPE, keyData, function(error, msg){
    if(error) {
      console.log('Block auth error');
      console.log('MSG: ' + msg);
      setTimeout(function(){
        nfc.listen();
      }, 500);
    }
    else {
      isReadyListen = false;
      nfc.readBlock(blockNum, function(error, data){
        if(error) {
          console.log('Block read error');
          console.log('MSG: ' + data);
        } else {
          console.log('Block #' + blockNum + ' data: ' + getHexStr(data));
        }
        setTimeout(function(){
          nfc.listen();
        }, 500);
      });
    }
  });
}

function readMifareUltralight() {
  nfc.readPage(4, function(error, data){
    if(!error) {
      console.log('Page data: ' + data);
    } else {
      console.log('Page read error');
    }
  });
}

nfc.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
    // выводим в консоль полученные данные
    console.log('Card UID: ' + getHexStr(data.uid));
    if(data.uid.length == 4) {
      readMifareClassic(data.uid, mifareKey, 4);
    }
    if(data.uid.length == 7) {
      readMifareUltralight();
    }
  }
});