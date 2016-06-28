var eth = null;

function setupEthernet() {
  SPI2.setup({ mosi:B15, miso:B14, sck:B13 });
  eth = require("WIZnet").connect(SPI2, B10);
  //eth = require("WIZnet").connect();
  //eth.setIP();
  eth.setIP({ip: "172.18.29.54", subnet: "255.255.224.0", gateway: "172.18.0.1", dns: "172.18.0.1"});
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

function logIn() {
  var content = "UserName=SLSrv78621&Rassword=SL123ksd___uuxx_hf_____123123SL";
  var options = {
	host: 'sync.sportlifeclub.ru',
	port: '60080',
    path: '/slsrv/account/login',
    protocol: "http:",
    method: 'POST',
    headers:{
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Length":content.length
    }
  };

  console.log('Connectiong to Server ... ');
  require("http").request(options, function(res) {
    console.log('Connected to Server');
    var nRecv = 0;
    res.on('data', function(data) {
      nRecv += data.length;
      console.log(data);
    });

    res.on('close',function(data) {
           console.log("Server connection closed, " + nRecv + " bytes received");
           console.log(data);
   });
  }).end(content);
}

function getState() {
  var content = "chip=011000000168435012";
  var options = {
	host: 'sync.sportlifeclub.ru',
	port: '60080',
    path: '/slsrv/Chip/GetState',
    protocol: "http:",
    method: "POST",
    headers:{
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Length":content.length
    }
  };

  console.log('Connectiong to Server ... ');
  require("http").request(options, function(res) {
    console.log('Connected to Server');
    var nRecv = 0;
    res.on('data', function(data) {
      nRecv += data.length;
      console.log(data);
    });
    res.on('close',function(data) {
           console.log("Server connection closed, " + nRecv + " bytes received");
           console.log(data);
   });
  }).end(content);
}



setupEthernet();
var ip = eth.getIP();
console.log(ip);
getState();
