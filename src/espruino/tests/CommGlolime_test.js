var PIN_ETH_IRQ  = P1;
var PIN_ETH_RST  = P0;
var PIN_ETH_CS   = B12;
var NETWORK_CONFIG = {mac: "56:44:58:0:0:05", ip: "192.168.0.201", subnet: "255.255.255.0", gateway: "192.168.0.1", dns: "192.168.0.1"};

// setup ethernet module
console.log("Setup ethernet module");
PIN_ETH_RST.set();
PIN_ETH_IRQ.set();
SPI2.setup({mosi:B15, miso:B14, sck:B13});
var eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
eth.setIP(NETWORK_CONFIG);
console.log(eth.getIP());

var client = require("net");
var host = "192.168.0.100";
var crc = require("CRC16").create();
var p = require('Ping');

var glolime = require("CommGlolime").create();
glolime.setup(client, host, crc, p);

var cardType = 0x01;
var arrayUid = [148, 143, 32, 99];

function processBalance(error, data){
  console.log("ERROR CODE: " + error);
  if(error === 0) {
    console.log("USER ID: " + data.userId);
    console.log("USER TYPE: " + data.userType);
    console.log("BALANCE: " + data.balance);
  }
  if(error == 241) {
    PIN_ETH_RST.reset();
    console.log("reset ETH_RST pin");
    setTimeout(function() {
      console.log("set ETH_RST pin");
      PIN_ETH_RST.set();
      glolime.getBalance(cardType, arrayUid, processBalance);
    }, 3000);
  }
}

function processSell(error, data){
   console.log("ERROR CODE: " + error);
}


glolime.getBalance(cardType, arrayUid, processBalance);
setTimeout(function(){
  console.log(':: SELL PRODUCT\n');
  glolime.sellProduct('11', '2000', '35', processSell);
},2000);
