var HOST = '192.168.0.5';
var NETWORK_CONFIG = {mac: "56:44:58:0:0:06"};

var PIN_ETH_IRQ  = P1;
var PIN_ETH_RST  = P0;
var PIN_ETH_CS   = B12;

// setup ethernet module
console.log("Setup ethernet module");
PIN_ETH_RST.set();
PIN_ETH_IRQ.set();
SPI2.setup({mosi:B15, miso:B14, sck:B13});
eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
eth.setIP(NETWORK_CONFIG);
setTimeout(function(){
  eth.setIP();
  var addr = eth.getIP();
  console.log(addr);

  start_ping();
}, 1000);

function start_ping(){
  _serverWakeupInterval = setInterval(function() {
    console.log('Server waiting...');
    var p = require('Ping');
    p.ping({ address: HOST, port:6767, timeout:2000, attempts:2 }, function(err, data) {
      if(data != 'undefined') {
        console.log('Server started!!!');
        clearInterval(_serverWakeupInterval);

        console.log('DATA:');
        console.log(data);
      }
      else {
        if(err != 'undefined') {
          console.log('Server does not response');
        }
      }
    });
  }, 10000);
}