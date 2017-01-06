// настраиваем I2C1 для работы модуля
I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
 
// подключаем модуль к I2C1 и пину прерывания
var nfc = require('nfc').connect({i2c: I2C1, irqPin: P10});
 
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
 
// указываем страницу для чтения данных
var page2read = 5;
 
nfc.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
    // выводим в консоль полученные данные
    print(data);
    // читаем указанную страницу данных
    nfc.readPage(page2read, function(error, buffer) {
      if(error) {
        print('page read error');
      } else {
        print('page read result: ', buffer);
        // обновляем данные для записи. Например, увеличиваем на единицу
        for (var i in buffer) {
          buffer[i]++;
        }
      }
    });
  }
 
  // каждые 1000 миллисекунд слушаем новую метку
  setTimeout(function () {
    nfc.listen();
  }, 1000);
});