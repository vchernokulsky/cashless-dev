var page2read = 0;
var chipid_for_parse = "011000000168435012";
var uid_for_parse = [2, 100, 1, 112];
var is_page_ready = false;
var page2read = 0;
var counter = 0;

// подготавливаем данные для записи
var page1 = new Array(11, 0, 0, 168);
var page2 = new Array(435, 12, 0, 0);


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
    var result = makeChipidByRFID(data.uid);
    //console.log(" RFID data: " + data.uid);
    //console.log("    Chipid: " + result);

    page2process = 3;
    if (!is_page_ready){
      if (counter === 0) {
        nfc.writePage(page2process, page1, function(error) {
          if (error) {
            console.log('write page ERROR', result);
          } else {
            console.log('write page OK. Data: ' + page1);
            counter++;
          }
        });
      } else {
        nfc.writePage(page2process+1, page2, function(error) {
          if (error) {
            console.log('write page ERROR', result);
          } else {
            console.log('write page OK. Data: ' + page2);
            is_page_ready = true;
          }
        });
      }
      console.log(" 1) page is not ready ");
    } else {
      console.log(" 2) page " + page2read + " is ready ");
      nfc.readPage(page2read, function(error, buffer) {
        if(error) {
          console.log('page ' + page2read + ' read error');
        } else {
          // печатаем результат чтения байт данных
          console.log(" read result: ", buffer);
        }
      });
      page2read++;
    }
  }
  // каждые 1000 миллисекунд слушаем новую метку
  setTimeout(function () {
    nfc.listen();
  }, 1000);
});


function makeChipidByRFID(buffer){
  var result = "";
  for (var i = 0; i < buffer.length; i++){
    result = result + makeArrayElem(buffer[i]);
  }
  return result;
}

function makeArrayElem(elem){
  var res = "";
  if (elem === 0){
    res = "000";
    return res;
  }
  var counter = 0, i = 1, j = 0;
  for (i=1; i<=2; i++){
    if (Math.floor(elem/Math.pow(10,i)) === 0){
      counter++;
    }
  }
  if (counter === 0) {
    res += elem;
  } else {
    res = elem.toString();
    for(j=0; j<counter; j++){
       res = "0" + res;
    }
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