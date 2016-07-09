Serial2.setup(9600, {rx:A3, tx:A2, bytesize:9, stopbits:1});

var _MDB = require("mdb").create();
var _parser = require("MDBCmdParser").create();
var state = _MDB.CASHLESS_STATE.INACTIVE;

var strBalance = "7754650";
var curBalance = 0;
var itemPrice = 0;

var lastCmd = null;

var delayCmd = null;
function processInternalState(data) {
  var cmd = data[0] & _MDB.MASK.COMMAND;
  switch(state) {
    case _MDB.CASHLESS_STATE.INACTIVE:
        switch(cmd) {
          case _MDB.CASHLESS_MSG.RESET:
            sendMessage([_MDB.COMMON_MSG.ACK]);
            console.log('(INACTIVE)|RECV:RESET ; SEND: ACK');
            break;
          case _MDB.CASHLESS_MSG.POLL:
            if(delayCmd!==null) {
                sendMessage(delayCmd);
                lastCmd = delayCmd;
                delayCmd = null;
                state = _MDB.CASHLESS_STATE.DISABLED;                
                console.log('(INACTIVE)|RECV:POLL ; SEND: Reader Response');                
            }
            else {
                sendMessage([0x00, 0x00]);
                lastCmd = [0x00, 0x00];
                console.log('(INACTIVE)|RECV:POLL ; SEND: JUST RESET');
            }
            break;
          case _MDB.CASHLESS_MSG.SETUP:
            // RESPONSE: Reader Response 
            delayCmd = [0x01, 0x01, 0x2A, 0x11, 0x01, 0x00, 0x0A, 0x00, 0x48];
            sendMessage(_MDB.COMMON_MSG.ACK);
            console.log('(INACTIVE)|RECV:SETUP ; SEND: ACK');
            break;
        }
      break;
    case _MDB.CASHLESS_STATE.DISABLED:
        switch(cmd) {
          case _MDB.CASHLESS_MSG.RESET:
            sendMessage([_MDB.COMMON_MSG.ACK]);
            state = _MDB.CASHLESS_STATE.INACTIVE;            
            console.log('(DISABLED)|RECV:RESET ; SEND: ACK');
            break;
          case _MDB.CASHLESS_MSG.POLL:
            // Это надо проверить снифером!!!
            if (delayCmd !== null){
                sendMessage(delayCmd);
                delayCmd = null;
                console.log('(DISABLED)|RECV:POLL ; SEND: delayCmd');
            } else {
                sendMessage([_MDB.COMMON_MSG.ACK]);
                console.log('(DISABLED)|RECV:POLL ; SEND: ACK');
            }
            break;
          case _MDB.CASHLESS_MSG.READER:
            var sub = data[1];
            if(sub == 0x01) {   // Reader Enable
                sendMessage([_MDB.COMMON_MSG.ACK]);            
                state = _MDB.CASHLESS_STATE.ENABLED;
            }
            //
            if(sub == 0x02) {  // Reader Disable
                sendMessage([_MDB.COMMON_MSG.ACK]);
            }
            if(sub == 0x03) {  // Reader Cancel
                // Cmd out of sequence
                delayCmd = [0x0B, 0x0B];
            }
            break;
          case _MDB.CASHLESS_MSG.EXTRA:
            if (sub == 0x00) { // EXPANSION ID REQUEST 
                sendMessage([_MDB.COMMON_MSG.ACK]);
                delayCmd = [0x01, 0x02, 0xFF, 0x02];
            }
          break;
        }    
      break;
    case _MDB.CASHLESS_STATE.ENABLED:
        switch (cmd){
            case _MDB.CASHLESS_MSG.POLL: 
                var balance = parseInt(strBalance, 10);
                if (balance > 650){
                    curBalance = 650;
                } else {
                    curBalance = balance;
                }
                var value = curBalance * 100;
                var tmp = [];
                for(var i=3; i>0; i--) {
                    tmp[i] = value >> 8*i;
                }
                chk = _MDB.calcChkByte([ 0x03, tmp[0], tmp[1]]);
                // send Begin Session
                sendMessage([0x03, tmp[0], tmp[1], chk]);
                lastCmd = [0x03, tmp[0], tmp[1], chk];
                state = _MDB.CASHLESS_STATE.IDLE; 
                console.log('(ENABLED)|RECV:POLL ; SEND: ACK');
            break; 
        }
      break;
    case _MDB.CASHLESS_STATE.IDLE:
        switch (cmd){
            case _MDB.CASHLESS_MSG.VEND:
                switch(sub) {
                    case 0x00: // Vend Request
                        itemPrice = ((value | cmd[2]) << 8) | cmd[3];  //item price SCALED!!!
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        state = _MDB.CASHLESS_STATE.VEND; 
                        console.log('(IDLE)|RECV:VEND ; SEND: ACK');
                    break;
                    case 0x04: // Session Complete
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        console.log('(IDLE)|RECV:VEND ; SEND: ACK');
                    break;
                    // другие sub 
                }
            case _MDB.CASHLESS_MSG.POLL:
                // send End Session
                sendMessage([0x07, 0x07]);
                lastCmd = [0x03, tmp[0], tmp[1], chk];
                state = _MDB.CASHLESS_STATE.ENABLED; 
            break;   
        }
      break;
    case _MDB.CASHLESS_STATE.VEND:
        switch (cmd){
            case _MDB.CASHLESS_MSG.POLL:    
                curBalance -= itemPrice;
                var tmp = [];
                for(var i=3; i>0; i--) {
                    tmp[i] = value >> 8*i;
                }
                chk = _MDB.calcChkByte([ 0x03, tmp[0], tmp[1]]);                
                // send Vend Approved
                sendMessage([0x03, tmp[0], tmp[1], chk]);
                lastCmd = [0x03, tmp[0], tmp[1], chk];
                console.log('(ENABLED)|RECV:POLL ; SEND: Vend Approve');
            break; 
            case _MDB.CASHLESS_MSG.VEND:
                switch(sub) {
                    case 0x02: // VEND SUCCESS
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        state = _MDB.CASHLESS_STATE.IDLE;
                        console.log('(ENABLED)|RECV:POLL ; SEND: ACK');
                    break;
                }
                // другие sub
            break;
        }
    
      break;
    default:
      console.log('Incorrect device state!!!');
      break;
  }
}

function sendMessage(data) {
    console.log('SEND RAW:[' + data + ']');
    // var addr = 0x40004404;
    // console.log('send: ' + data);
    // if(data.length==1) {
        // last = 0x0100;
        // last |= data[0];
        // poke16(addr, last);
    // }
    // else {
        // last = 0x0100;
        // last |= data[1];
        // serial2.write(data[0]);
        // poke16(addr, last);
    // }
}

function toHexString(data) {
    var str = '[';
    for(var i=0; i<data.length; i++) {
        str += data.charCodeAt(i).toString(16) + ' ';
    }
    str += ']';
    return str;
}

function toByteArray(data) {
    var buffer = new Uint8Array(data.length);
    for(var i=0; i<data.length; i++) {
        buffer[i] = data.charCodeAt(i);
    }
    return buffer;
}

var isCmdReading = false;
function processSerialData(data) {
    //this ubly hack work without validator only
    //TODO: implement MDB address byte reading    
    if(!isCmdReading) {
        var addr = data[0] & _MDB.MASK.ADDRESS;     
        isCmdReading = (addr == _MDB.ADDRESS.CASHLESS1);
        if (data[0] === _MDB.COMMON_MSG.ACK){
            lastCmd = null;
        }
        if ((data[0] == _MDB.COMMON_MSG.NAK)||
            (data[0] == _MDB.COMMON_MSG.RET)) {
            //TODO: какая разница между NAK и RET?
            sendMessage(lastCmd);
        }
    }
    //cashless command reading
    if(isCmdReading) {
        _parser.putData(data);
        var cmd = _parser.getResult();
        if(cmd !== null) {
            console.log('CMD: [' + cmd + ']');
            processInternalState(cmd);
            _parser.clearResult();
            isCmdReading = false;
        }
    } //output just for testing
    else {
        console.log('CMD for address: ' + data);    
    }
}

/////////////////////////////////////
//External events handlers
/////////////////////////////////////
Serial2.on('data', function(data) {
    console.log('RAW: ', toHexString(data));
    var msg = toByteArray(data);
    processSerialData(msg);
    // var addr = msg[0] & _MDB.MASK.ADDRESS;
    // if(addr==0x10) {
        // _parser.putData(msg);
        // var cmd = _parser.getResult();
        // if(cmd !== null) {
            // console.log('CMD: ' + cmd);
            // processInternalState(cmd);
            // _parser.clearResult();
        // }
    // }
});

/////////////////////////////////////
// Mockups for testing FSM logic
/////////////////////////////////////
function recvDataMockup() {
    //CMD: RESET
    processSerialData([0x10, 0x10]);    
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    //CMD: SETUP
    processSerialData([0x11, 0x00, 0x03, 25, 2, 0x01, 0x30]);
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    
    //
    //CMD: POLL (for VALIDATOR)
    processSerialData([0x30, 0x30]);
}

/////////////////////////////////////
//Program entry point
/////////////////////////////////////
setTimeout(function(){
    recvDataMockup();
}, 1000);
