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

//RECV session params
var cmd = null;
var state = mdb.CASHLESS_STATE.INACTIVE;
function processInternalState(data) {
  switch(state) {
    case mdb.CASHLESS_STATE.INACTIVE:
      break;
    case mdb.CASHLESS_STATE.DISABLED:
      break;
    case mdb.CASHLESS_STATE.ENABLED:
      break;
    case mdb.CASHLESS_STATE.IDLE:
      break;
    case mdb.CASHLESS_STATE.VEND:
      break;
    default:
      console.log('Incorrect device state!!!');
      break;
  }
}

function inactiveState(data) {
}

function parseMessage(data) {
  if(bufLen === 0) {
    cmd = data[0] & mdb.MASK.COMMAND;
  }
  // start command processing
  switch(cmd) {
    case mdb.CASHLESS_MSG.RESET:
      console.log('RECV: (RESET)');
      break;
    case mdb.CASHLESS_MSG.SETUP:
      //console.log(data);
      appendData(data);
      parseSetupCommand(data);
      break;
    case mdb.CASHLESS_MSG.POLL:
      console.log('RECV: (POLL)');
      break;
  }
}

// variables for recv command fragments
var bufLen = 0;
var buffer = Uint8Array(36);
function parseSetupCommand() {
  if(bufLen < 2) {
    console.log('RECV: (SETUP)');
    return;
  }
  // process command buffer
  var subCmd = buffer[1];
  switch(subCmd) {
    case 0x00:  //Config Data command
      if(bufLen > 6) {
        var isCHK = mdb.checkLastByte(buffer, bufLen);
        if(isCHK) {
          sendMessage(mdb.COMMON_MSG.ACK);
          console.log('CMD: ' + buffer.slice(0, bufLen-1));
          console.log('CHK: ' + buffer[bufLen-1]);
        }
        else {
          console.log('CHK incorrect');
          sendMessage(mdb.COMMON_MSG_NAK);
        }
        bufLen = 0;
      }
      break;
    case 0x01:  //Max/Min Prices
      if(bufLen > 6) {
        var isCHK = mdb.checkLastByte(buffer);
        if(isCHK) {
          sendMessage(mdb.COMMON_MSG.ACK);
        }
        bufLen = 0;
      }
      break;
  }
}

function parsePollCommand() {
}

// transport layer processing
function appendData(data) {
  for(var i=0; i<data.length; i++) {
    buffer[bufLen+i] = data[i];
  }
  bufLen += data.length;
  //console.log(buffer);
}

function sendMessage(data) {
}

var addrByte = 0x00;
Serial2.on('data', function(data) {
  if(bufLen === 0) {
    addrByte   = data.charCodeAt(0);
    var msgObj = mdb.parseAddrByte(addr);
    parseMessage(msgObj, data);
  }
  else {
  }
});

// Mockups for check parser logic
function dataRecvMockup(data) {
  parseMessage(data);
}

setInterval(function() {
  dataRecvMockup([0x11]);
  dataRecvMockup([0x00, 0x03]);
  dataRecvMockup([25, 2, 0x00]);
  dataRecvMockup([0x2F]);
}, 2000);


