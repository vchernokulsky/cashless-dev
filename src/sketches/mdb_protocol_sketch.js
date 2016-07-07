Serial2.setup(9600, {rx:A3, tx:A2, bytesize:9, stopbits:1});

var mdb = require("mdb").create();
var addr = mdb.ADDRESS.CASHLESS1;


function toHexString(data) {
  var str = '[';
  for(var i=0; i<data.length; i++) {
    str += data.charCodeAt(i).toString(16) + ' ';
  }
  str += ']';
  return str;
}

Serial2.on('data', function(data) {
  console.log('RAW: ' + toHexString(data));
  var cmd = data.charCodeAt(0);
  if(cmd == 0x10) {
      Serial.write([256]);
      console.log('send: ACK');
  }
});

//setInterval(function() {
//  console.log('SEND: ' + addr);
//  Serial4.write([addr]);
//}, 2000);


