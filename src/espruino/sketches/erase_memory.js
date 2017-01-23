var flash = require('Flash');
var buffer = new Uint8Array(0);

var addr_free_mem = flash.getFree();
addr = addr_free_mem[0].addr;
console.log(addr_free_mem);

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
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

var str = "192.168.0.5|192.168.0.20|255.255.255.0|";
buffer = str2ab(str);
var l = buffer.length + (4-buffer.length%4);
console.log("l = " + l);
console.log(ab2str(buffer));
var buf = new Uint8Array(l);
var i, j;

for (i = 0; i<l;i++){
  if (i>buffer.length)
    buf[i] = 0;
  else
    buf[i] = buffer[i];
}

console.log(buf);


var flash = require('Flash');
var addr_free_mem = flash.getFree();
addr = addr_free_mem[0].addr;
console.log('free mem');
console.log(addr_free_mem);

flash.erasePage(addr);
flash.write(buf, addr);

var data_1 = flash.read(buf.length, addr);

var result = ab2str(buffer);

console.log("2: ");
for (var i=0;i<data_1.length;i++){
  console.log(data_1[i]);
}

console.log('result  ' + result);

var param = result.split('|');
var p = param.slice(0,3);
console.log(p);

