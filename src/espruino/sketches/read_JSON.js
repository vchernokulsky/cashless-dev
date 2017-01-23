var settings = {
  config: {
    IP: "192.168.0.5",
    HOST: "192.168.0.20",
    MASK: "255.255.255.0",
  }
};

//console.log("JSON to write");
//console.log(settings);

function str2ab(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  var strLen=str.length;
  for (var i=0; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function ab2str(buf) {
  var str = "";
  for (var i = 0; i < buf.length; i++){
    str+=String.fromCharCode(buf[i]);
  }
  return str;
}

var str = JSON.stringify(settings);

//console.log("Text to write: " + str);


var buffer = str2ab(str);
var l = buffer.length + (4-buffer.length%4);
//console.log("length buffer = " + l);
//console.log(ab2str(buffer));
var buf = new Uint8Array(l);
var i, j;

for (i = 0; i<l;i++){
  if (i>buffer.length)
    buf[i] = 0;
  else
    buf[i] = buffer[i];
}

//console.log("Numbers to write: " + buf);

var flash = require('Flash');
var addr_free_mem = flash.getFree();
addr = addr_free_mem[0].addr;
//console.log('free mem:: ');
//console.log(addr_free_mem);

/*
flash.erasePage(addr);
flash.write(buf, addr);
*/
var data_1 = flash.read(buf.length, addr);

//console.log("Read Data ::  " + data_1);

var temp = ab2str(data_1);

var result = JSON.parse(temp);

console.log("RESULT ::  ");
console.log(result);

console.log(result.config.IP);