var PIN_ETH_RST  = P0;
var PIN_ETH_IRQ  = P1;
var PIN_ETH_CS   = B12;

var _sessionId = 0;

PIN_ETH_RST.set();
PIN_ETH_IRQ.set();
SPI2.setup({mosi:B15, miso:B14, sck:B13});
eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
eth.setIP({mac: '56:44:58:00:00:07'});
setTimeout(function(){
  eth.setIP();
  var addr = eth.getIP();
  console.log(addr);
  console.log("Ethernet module OK");
  funnyBlinker();
  var intId = setInterval(function(){
    _sessionId++;
    http_post_test(_sessionId);
  }, 1000);
}, 1000);


function logger(data) {
  console.log(data);
}

function funnyBlinker() {
  P5.reset();
  P7.set();
  setTimeout(function(){
    P7.reset();
    P6.set();
    setTimeout(function(){
      P6.reset();
      P5.set();
      setTimeout(funnyBlinker, 500);
    }, 500);
  }, 500);
}

function http_post_test (sessionId) {
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
    var beginTime = getTime();
    logger('vvvvvvvvvvv (' + sessionId + ') vvvvvvvvvvv');
    logger('(' + sessionId + ') begin :' + beginTime);
	var http = require("http");
	http.request(options, function(res) {
		logger('(' + sessionId + ') ok');
		var nRecv = 0;
		var Resp = "";
		res.on('data', function(data) {
          nRecv += data.length;
          Resp += data;
		});
		res.on('close',function(data) {
          var endTime = getTime();
          logger('(' + sessionId + ') end : ' + endTime);
          logger('(' + sessionId + ') get : ' + nRecv + ' bytes');
          logger('(' + sessionId + ') duration: ' + (endTime - beginTime));
          logger('^^^^^^^^^^^ (' + sessionId + ') ^^^^^^^^^^^\r\n');
		});
        res.on('error',function(error){
          logger('(' + sessionId + ') error' + error);
        });
	}).end(content);
}