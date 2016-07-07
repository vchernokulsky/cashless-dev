Serial2.setup(9600, {rx:A3, tx:A2, bytesize:9, stopbits:1});

function toHexString(data) {
  var str = '[';
  for(var i=0; i<data.length; i++) {
    str += data.charCodeAt(i).toString(16) + ' ';
  }
  str += ']';
  return str;
}

function sendMessage(data) {
  var addr = 0x40004404;
  if(data.length==1) {
    last = 0x0100;
    last |= data[0];
    poke16(addr, last);
    //console.log(last);
  }
  else {
    last = 0x0100;
    last |= data[1];
    Serial2.write(data[0]);
    poke16(addr, last);
  }
}

byteCnt = 0;
Serial2.on('data', function(data) {
  console.log('RAW: ' + toHexString(data));
  var cmd = data.charCodeAt(0);
  if(cmd == 0x30) {
      byteCnt += 1;
      if(byteCnt == 2) {
        byteCnt = 0;
        setTimeout(function(){
          sendMessage([0x00]);
          console.log('send: ACK');
        }, 0);
      }
  }
  if(cmd == 0x10) {
      byteCnt += 1;
      if(byteCnt == 2) {
        byteCnt = 0;
        setTimeout(function(){
          sendMessage([0x00]);
          console.log('send: ACK');
        }, 0);
      }
  }
  if(cmd == 0x12) {
    byteCnt += 1;
    if(byteCnt == 2) {
      sendMessage([0x00, 0x00]);
      console.log('SEND: Just Reset');
    }
  }
  else {

  }
});

