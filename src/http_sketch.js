var eth = null;

function setupEthernet() {
  SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  eth = require("WIZnet").connect(SPI2, B10);
  eth.setIP();
}

function startReading() {
  var http = require("http");
  console.log('wait for HTTPS response');
  http.get("https://www.google.com", function(res) {
    res.on('data', function(data) {
      console.log(data);
    });
  });
}


setupEthernet();
setTimeout(function() {
  var ip = eth.getIP();
  console.log(ip);
  startReading();
}, 2000);