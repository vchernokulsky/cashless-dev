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
    print(data);
  }

  // каждые 1000 миллисекунд слушаем новую метку
  setTimeout(function () {
    nfc.listen();
  }, 1000);
});