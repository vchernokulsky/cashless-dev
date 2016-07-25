var page2read = 0;
var chipid_for_parse = "011000000168435012";
var uid_for_parse = [2, 100, 1, 112];
var is_page_ready = false;
var page2read = 0;
var counter = 0;
var page2process = 0;

// подготавливаем данные для записи
/**/
var page1 = new Array(1,10,0,0);
var page2 = new Array(1,68,43,50);
var page3 = new Array(12,0,0,0);
/**/

/*
var page1 = new Array(0,0,0,0);
var page2 = new Array(0,0,0,0);
var page3 = new Array(0,0,0,0);
*/

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
    page2process = 4;
    if (!is_page_ready){
      if (counter === 0) {
        nfc.writePage(page2process, page1, function(error) {
          if (error) {
            console.log('write page ERROR', result);
          } else {
            console.log('write page '+page2process+' OK. Data: ' + page1);
            counter++;
          }
        });
      }
      if (counter == 1){
        page2process = 5;
        nfc.writePage(page2process, page2, function(error) {
          if (error) {
            console.log('write page ERROR', result);
          } else {
            console.log('write page '+page2process+' OK. Data: ' + page2);
            counter++;
          }
        });
      }
      if (counter == 2){
        page2process = 6;
        nfc.writePage(page2process, page3, function(error) {
          if (error) {
            console.log('write page ERROR', result);
          } else {
            console.log('write page '+page2process+' OK. Data: ' + page3);
            is_page_ready = true;
          }
        });
      }
      console.log(" 1) page is not ready ");
    } else {
      counter = 0;
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
