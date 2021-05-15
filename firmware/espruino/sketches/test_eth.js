var PIN_ETH_RST  = P0;
var PIN_ETH_IRQ  = P1;
var PIN_ETH_CS   = B12;

PIN_ETH_RST.set();
PIN_ETH_IRQ.set();
SPI2.setup({mosi:B15, miso:B14, sck:B13});
eth = require("WIZnet").connect(SPI2, PIN_ETH_CS);
eth.setIP({mac: "56:44:58:30:30:31"});
setTimeout(function(){
  eth.setIP();
  console.log(eth.getIP());

  for(var i=1; i<21; i++) {
    setTimeout(function(sessionId){
      request(sessionId);
    }, 750*i, i);
  }
}, 1000);

function logger(msg) {
  console.log(msg);
}

function request(sessionId) {
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
  logger('(' + sessionId + ') begin :' + beginTime);
  var http = require("http");
  //try {
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
          logger('(' + sessionId + ') end for :' + (endTime - beginTime) + 's');
        });
      }).end();
  //}
  //catch(ex) {
  //  console.log(ex);
  //}
}

