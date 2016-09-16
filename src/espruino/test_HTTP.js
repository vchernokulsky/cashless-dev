var PIN_ETH_IRQ  = P1; //B12-стенд_sportlife //P10-стенд //P1-зеленая
var PIN_ETH_RST  = P0;
var PIN_ETH_CS      = B12;


PIN_ETH_RST.set();
PIN_ETH_IRQ.set();
SPI2.setup({mosi:B15, miso:B14, sck:B13});
eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
//eth.setIP(SPORTLIFE_STATIC_ADDR);
eth.setIP();
var addr = eth.getIP();
console.log(addr);
console.log("Ethernet module OK");

var http;
var it = 0;

/*
var intId = setInterval(function(){
	console.log("i= " + it);
	http = require("http");
	console.log(" send...");
	http.get("http://www.espruino.com", function(res) {
	  res.on('data', function(data) {
		//console.log("ok");
		//console.log(data);
	  });
	  res.on('close', function(data) {
		console.log(" close");
	  });
	});
	it++;
 },1000);
*/

function logger(data) {
  console.log(data);
}
var increm = 0;
function http_post_test () {
    console.log(" i = " + increm);
    var content = "VEND IoT POST TESTING";
	var options = {
		host: 'httpbin.org',
		port: '80',
		path: '/post',
		protocol: "http:",
		method: "POST",
		headers: {
		  "Content-Type":"application/x-www-form-urlencoded",
		  "Content-Length":content.length
		}
	};
	logger('(3) begin');
	var http = require("http");
	http.request(options, function(res) {
		logger('(3) ok');
		var nRecv = 0;
		var Resp = "";
		res.on('data', function(data) {
          nRecv += data.length;
          Resp += data;
		});
		res.on('close',function(data) {
			logger("(3) end: " );
		});
	}).end(content);
    increm++;
}

var intId = setInterval(http_post_test, 1000);