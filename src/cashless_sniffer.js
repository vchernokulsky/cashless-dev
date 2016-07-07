Serial2.setup(9600, {rx:A3, tx:A2, bytesize:9, stopbits:1});

var mdb = require("mdb").create();
var addr = mdb.ADDRESS.CASHLESS1;

var setup_code = 0;

var setup_config_data = {
  'code_cmd' : 0x00,
  'config_data' : 0x01,
  'VCM_f_level' : 0x01,
  'cols_on_display' : 0x00,
  'rows_on_display' : 0x00,
  'display_info' : 0x00
};

var setup_mm_prices = {
  'code_cmd' : 0x01,
  'mm_prices' : 0x01,
  'max_price' : 0x00,
  'min_price' : 0x00
};

var response_config_data = {
  'reader_config_data' : 0x01,
  'reader_f_level' : 0x01,
  'county_code_h' : 42,
  'county_code_l' : 17,
  'scale_factor' : 0x1,
  'decimal_places' : 0x01,
  'app_max_resp_time' : 10,
  'options' : 0
 };


var response_POLL_1 = {
///
 };



function toHexString(data) {
  var str = '[';
  for(var i=0; i<data.length; i++) {
    str += data.charCodeAt(i).toString(16) + ' ';
  }
  str += ']';
  return str;
}

var cmd = null;
var isReceived = false;
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
          saveSetupInfo(0);
          printSetupInfo(0);
        }
        else {
          console.log('CHK incorrect');
          sendMessage(mdb.COMMON_MSG_NAK);
        }
        bufLen = 0;
      }
      break;
    case 0x01:  //Max/Min Prices
      if(bufLen > 5) {
        var isCHK = mdb.checkLastByte(buffer);
        if(isCHK) {
          sendMessage(mdb.COMMON_MSG.ACK);
          saveSetupInfo(1);
          bufLen = 0;
        }
      }
      break;
  }
}

function saveSetupInfo (setup_code){
  if (setup_code){
    //Max/Min Prices into Struct
    setup_mm_prices.code_cmd = buffer[0];
    setup_mm_prices.mm_prices = buffer[1];
    setup_mm_prices.max_price = buffer.slice(2,3);
    setup_mm_prices.min_price = buffer.slise(4,5);
  } else {
    //Config Data command into Struct
    setup_config_data.code_cmd = buffer[0];
    setup_config_data.config_data = buffer[1];
    setup_config_data.VCM_f_level = buffer[2];
    setup_config_data.cols_on_display = buffer[3];
    setup_config_data.rows_on_display = buffer.slice(4,5);
    setup_config_data.display_info = buffer.slice(5,bufLen-1);
  }
}

function resetSetupInfoDefault(setup_code){
  if (setup_code){
    //Max/Min Prices Struct reset to default
    setup_mm_prices.mm_prices = 0x01;
    setup_mm_prices.max_price = 0x00;
    setup_mm_prices.min_price = 0x00;
  } else {
    //Config Data Struct reset to default
    setup_config_data.code_cmd = 0x00;
    setup_config_data.config_data = 0x01;
    setup_config_data.VCM_f_level = 0x01;
    setup_config_data.cols_on_display = 0x00;
    setup_config_data.rows_on_display = 0x00;
    setup_config_data.display_info = 0x00;
  }
}

function printSetupInfo (setup_code) {
   console.log(' -> Printing Setup Comand Info ');
  if (setup_code){
    //Max/Min Prices Struct info print
    console.log('SETUP: ', setup_mm_prices.code_cmd);
    console.log('Max / Min Prices: ', setup_mm_prices.mm_prices);
    console.log('Maximum Prices: ', setup_mm_prices.max_prices);
    console.log('Minimum Prices: ', setup_mm_prices.min_prices);
  } else {
    //Config Data Struct info print
    console.log('SETUP: ', setup_config_data.code_cmd);
    console.log('Config data: ', setup_config_data.config_data);
    console.log('VCM feauture level: ', setup_config_data.VCM_f_level);
    console.log('Colums on display: ', setup_config_data.cols_on_display);
    console.log('Rows on display: ', setup_config_data.rows_on_display);
    console.log('Display info: ', setup_config_data.display_info);
  }
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
  //
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