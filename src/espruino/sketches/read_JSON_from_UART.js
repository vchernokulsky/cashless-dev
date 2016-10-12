var cmdSerial6 = "";
var bufferSerial6 = "";

Serial6.setup(115200);
Serial6.on('data', function(data) {
  bufferSerial6 += data;
  var idx = bufferSerial6.indexOf('\n');
  if(idx > 0) {
    cmdSerial6 = bufferSerial6.slice(0, idx);
    bufferSerial6 = bufferSerial6.slice(idx, bufferSerial6.length-1);
    cmdSerial6 = cmdSerial6.trim();
    processSerial6Data(cmdSerial6);
  }
});

function processSerial6Data(serial6Data){
	var result = JSON.parse(serial6Data);
}

