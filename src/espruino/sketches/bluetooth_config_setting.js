var toWriteInFlash = new Uint8Array(0);
var cmdSerial6 = "";
var bufferSerial6 = "";
var count = 0;
Serial6.setup(9600);
console.log(" Serial6 listening... ");
Serial6.on('data', function(data) {
  bufferSerial6 += data;
  var idx = bufferSerial6.indexOf('\n');
  if(idx > 0) {
    console.log(" CMD: " + bufferSerial6);
    cmdSerial6 = bufferSerial6.slice(0, idx);
    bufferSerial6 = bufferSerial6.slice(idx, bufferSerial6.length-1);
    cmdSerial6 = cmdSerial6.trim();
    processSerial6Data();
  }
});

function ab2str(buf) {
  var str = "";
  for (var i = 0; i < buf.length; i++){
    str+=String.fromCharCode(buf[i]);
  }
  return str;
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  var strLen=str.length;
  for (var i=0; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function processSerial6Data(){
	var result = JSON.parse(cmdSerial6);
    console.log(" ===> Result from UART: ");
    console.log(result);
    writeInFlash();
}

function writeInFlash(){
  var toWriteInFlash = str2ab(cmdSerial6);
	var l = toWriteInFlash.length + (4-toWriteInFlash.length%4);
	var buf = new Uint8Array(l);
	var i, j;
	for (i = 0; i<l;i++){
      if (i>toWriteInFlash.length)
		buf[i] = 0;
      else
		buf[i] = toWriteInFlash[i];
	}
	var flash = require('Flash');
	var addr_free_mem = flash.getFree();
	var addr = addr_free_mem[0].addr;
	console.log(" Writing ... ");
	flash.erasePage(addr);
	flash.write(buf, addr);
	console.log(" Writing done! ");
    bufferSerial6 = "";
	reset();
    load();
    //enableDevice();
}