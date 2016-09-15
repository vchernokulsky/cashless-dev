var PIN_ETH_IRQ  = P1;
var PIN_ETH_RST  = P0;
var PIN_ETH_CS   = B12;
PIN_ETH_RST.set();
PIN_ETH_IRQ.set();
SPI2.setup({mosi:B15, miso:B14, sck:B13});
eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
//{ip: "192.168.20.205", mac: "56:44:58:30:30:31"}
eth.setIP();
var addr = eth.getIP();
console.log(addr);