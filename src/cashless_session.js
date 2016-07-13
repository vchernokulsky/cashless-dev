// setup RFID module
I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
Serial2.setup(9600, {rx:A3, tx:A2, bytesize:9, stopbits:1});

var rfidReader = require("nfc").connect({i2c: I2C1, irqPin: P9});
var _MDB = require("mdb").create();
var _parser = require("MDBCmdParser").create();

var state = _MDB.CASHLESS_STATE.INACTIVE;
//var _SERIAL_NUM = [0x09, 0x43,0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x43,0x44,0x20,0x20,0x4d,0x44,0x42,0x20,0x30,0x30,0x30,0x31, 0x01,0x26, 0xCA];
var _SERIAL_NUM = [0x09, 0x43,0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3];

var balanceReady = true; // FALSE!!! (TRUE for testing...)
var strBalance = "7754650";
var curBalance = 0;
var itemPrice = 0;

var lastCmd = null;

var delayCmd   = null;
var delayState = null;

var justResetCnt = 0;

function processInternalState(data) {
  var cmd = data[0] & _MDB.MASK.COMMAND;
  //console.log('MASK: ' + _MDB.MASK.COMMAND);
  //console.log('PROCESS CMD ID: 0x' + cmd.toString(16));
  switch(state) {
    case _MDB.CASHLESS_STATE.INACTIVE:
        switch(cmd) {
          case _MDB.CASHLESS_MSG.RESET:
            justResetCnt = 0x00;
            sendMessage([_MDB.COMMON_MSG.ACK]);
            delayCmd = [0x00, 0x00];
            //console.log('(INACTIVE)|RECV:RESET ; SEND: ACK');
            break;
          case _MDB.CASHLESS_MSG.POLL:
            if(delayCmd!==null) {
                sendMessage(delayCmd);
                //console.log('(INACTIVE)|RECV:POLL ; SEND: [' + delayCmd + ']');
                lastCmd = delayCmd;
                delayCmd = null;
                if (delayState !== null) {
                    state = delayState;
                    delayState = null;
                }
            }
            else {
                sendMessage([_MDB.COMMON_MSG.ACK]);
                //console.log('(INACTIVE)|RECV:POLL ; SEND: ACK');
            }
            break;
          case _MDB.CASHLESS_MSG.SETUP:
            // RESPONSE: Reader Response
            var sub = data[1];
            switch (sub){
                case 0x00: // Config Data
                    delayCmd = [0x01, 0x01, 0x2A, 0x11, 0x01, 0x00, 0x0A, 0x00, 0x48];
                    sendMessage([_MDB.COMMON_MSG.ACK]);
                    //console.log('(INACTIVE)|RECV:SETUP[Config Data] ; SEND: ACK');
                break;
                case 0x01: // Max / Min Price
                    sendMessage([_MDB.COMMON_MSG.ACK]);
                    //console.log('(INACTIVE)|RECV:SETUP[Max/Min Price] ; SEND: ACK');
                break;
            }
          break;
          case _MDB.CASHLESS_MSG.EXPANSION:
            var sub = data[1];
            switch(sub){
                case 0x00: // request id
                    sendMessage([_MDB.COMMON_MSG.ACK]);
                    // PeripheralID; 
                    delayCmd = _SERIAL_NUM;
                    //delayCmd = [0x09, 0x43,0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x43,0x44,0x20,0x20,0x4d,0x44,0x42,0x20,0x30,0x30,0x30,0x31, 0x01,0x26]
                    //chk = _MDB.calcChkByte(delayCmd);
                    //delayCmd = delayCmd.concat(chk);
                    //console.log('EXP: ' + delayCmd);
                    //console.log('LEN: ' + delayCmd.length);
                    delayState = _MDB.CASHLESS_STATE.DISABLED;
                    //console.log('(INACTIVE)|RECV:EXPANSION ; SEND: ACK');
                break;
            }
          break;  
        }
      break;
    case _MDB.CASHLESS_STATE.DISABLED:
        switch(cmd) {
          case _MDB.CASHLESS_MSG.RESET:
            sendMessage([_MDB.COMMON_MSG.ACK]);
            state = _MDB.CASHLESS_STATE.INACTIVE;
            debugger;
            //console.log('(DISABLED)|RECV:RESET ; SEND: ACK');
            break;
          case _MDB.CASHLESS_MSG.POLL:
            // Это надо проверить снифером!!!
            if (delayCmd !== null){
                sendMessage(delayCmd);
                //debugger;
                delayCmd = null;
                //console.log('(DISABLED)|RECV:POLL ; SEND: delayCmd');
            } else {
                sendMessage([_MDB.COMMON_MSG.ACK]);
                //console.log('(DISABLED)|RECV:POLL ; SEND: ACK');
                //debugger;
            }
            break;
          case _MDB.CASHLESS_MSG.READER:
            var sub = data[1];
            if(sub == 0x01) {   // Reader Enable
                sendMessage([_MDB.COMMON_MSG.ACK]);            
                state = _MDB.CASHLESS_STATE.ENABLED;
                debugger;
            }
            //
            if(sub == 0x02) {  // Reader Disable
                sendMessage([_MDB.COMMON_MSG.ACK]);
                debugger;
            }
            if(sub == 0x03) {  // Reader Cancel
                // Cmd out of sequence
                delayCmd = [0x0B, 0x0B];
                debugger;
            }
            break;
          case _MDB.CASHLESS_MSG.EXPANSION:
            if (sub == 0x00) { // EXPANSION ID REQUEST 
                sendMessage([_MDB.COMMON_MSG.ACK]);
                delayCmd = [0x01, 0x02, 0xFF, 0x02];
                debugger;
            }
          break;
        }    
      break;
    case _MDB.CASHLESS_STATE.ENABLED:
        switch (cmd){
            case _MDB.CASHLESS_MSG.POLL: 
				if (!balanceReady){
					// balance is not ready
					// Send ACK to VMC
					sendMessage([_MDB.COMMON_MSG.ACK]);
					//console.log('(ENABLED)|RECV:POLL ; SEND: ACK (balance isn\'t ready)');
				} else {
					// balance value is available
					balanceArr = getBalanceArr();
					// send Begin Session
					sendMessage(balanceArr);
					lastCmd = balanceArr;
					state = _MDB.CASHLESS_STATE.IDLE; 
					//console.log('(ENABLED)|RECV:POLL ; SEND: Begin Session');
				}
            break; 
        }
      break;
    case _MDB.CASHLESS_STATE.IDLE:
        switch (cmd){
            case _MDB.CASHLESS_MSG.VEND:
                var sub = data[1];
                switch(sub) {
                    case 0x00: // Vend Request
						var value = null;
                        itemPrice = ((value | data[2]) << 8) | data[3];  //item price SCALED!!!
						//console.log('\n');
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        state = _MDB.CASHLESS_STATE.VEND; 
                        //console.log('(IDLE)|RECV:VEND ; SEND: ACK (Vend Request)');
                        debugger;
                    break;
                    case 0x04: // Session Complete
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        //console.log('(IDLE)|RECV:VEND ; SEND: ACK (Session Complete)');
                        debugger;
                    break;
                    // другие sub 
                }
			break;
            case _MDB.CASHLESS_MSG.POLL:
                // send End Session
				//console.log(' --- (IDLE)|RECV:POLL ; TOTAL COMAND IS: ' + cmd);
                // TODO: FIX this check?
				if (state == _MDB.CASHLESS_STATE.IDLE){
					sendMessage([0x07, 0x07]);
					lastCmd = [0x07, 0x07];
					state = _MDB.CASHLESS_STATE.ENABLED; 
					//console.log('(IDLE)|RECV:POLL ; SEND: 0x07 (End Session)');
					// end Session => set to zero balance
					balanceReady = false;
                    debugger;
				}
            break;   
        }
      break;
    case _MDB.CASHLESS_STATE.VEND:
        switch (cmd){
            case _MDB.CASHLESS_MSG.POLL:    
                curBalance -= itemPrice;
                var tmp = [];
                for(var i=3; i>0; i--) {
                    tmp[i] = curBalance >> 8*i;
                }
                chk = _MDB.calcChkByte([ 0x03, tmp[0], tmp[1]]);                
                // send Vend Approved
                sendMessage([0x03, tmp[0], tmp[1], chk]);
                lastCmd = [0x03, tmp[0], tmp[1], chk];
                //console.log('(ENABLED)|RECV:POLL ; SEND: Vend Approved');
            break; 
            case _MDB.CASHLESS_MSG.VEND:
                var sub = data[1];
                switch(sub) {
                    case 0x02: // VEND SUCCESS
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        state = _MDB.CASHLESS_STATE.IDLE;
                        //console.log('(ENABLED)|RECV:POLL ; SEND: ACK (VEND SUCCESS)');
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

function getBalanceArr(){
	var balance = parseInt(strBalance, 10);
    if (balance > 650){
        curBalance = 650;
    } else {
        curBalance = balance;
    }
    var value = curBalance * 100;
    var tmp = [];
    for(var i=2; i>=0; i--) {
        tmp[i] = value >> 8*i;
    }
    chk = _MDB.calcChkByte([0x03, tmp[0], tmp[1]]);
	var result = [0x03, tmp[0], tmp[1], chk];
	//console.log(' == begin session sequence ' + result);
	return result;	
}

function sendMessage(data) {
    var addr = 0x40004404;
    if(data.length==1) {
        last = 0x0100;
        last |= data[0];
        poke16(addr, last);
    }
    else {
        last = 0x0100;
        last |= data[data.length-1];
        Serial2.write(data.slice(0, data.length-1));
        poke16(addr, last);
    }
    console.log('SEND RAW:[' + data + ']');    
}

// function getUserBalance() {
  // var content = "chip=011000000168435012"; // <-- UID
  // var options = {
	// host: 'sync.sportlifeclub.ru',
	// port: '60080',
    // path: '/slsrv/Chip/GetState',
    // protocol: "http:",
    // method: "POST",
    // headers: {
      // "Content-Type":"application/x-www-form-urlencoded",
      // "Content-Length":content.length
    // }
  // };

  // //console.log('Connectiong to Server ... ');
  // var sBalance = '';  
  // var http = require("http");
  // http.request(options, function(res) {
    // //console.log('Connected to Server');
    // var nRecv = 0;
    // res.on('data', function(data) {
      // //nRecv += data.length;
      // sBalance = data;
      // return sBalance;
    // });
    // res.on('close',function(data) {
      // //console.log("Server connection closed, " + nRecv + " bytes received");
    // });    
  // }).end(content);
// }

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
    //this ugly hack work without validator only
    //TODO: implement MDB address byte reading    
    //console.log('SERIAL INPUT: ' + data);
    if(!isCmdReading) {
        var addr = data[0] & _MDB.MASK.ADDRESS;
        isCmdReading = (addr == _MDB.ADDRESS.CASHLESS1);
        
        if (data[0] === _MDB.COMMON_MSG.ACK){
            console.log('RECV: ACK (from VMC)');
            lastCmd = null;
        }
        if ((data[0] == _MDB.COMMON_MSG.NAK)||
            (data[0] == _MDB.COMMON_MSG.RET)) {
            //TODO: какая разница между NAK и RET?
            console.log('RECV: NAK or RET (from VMC)');
            debugger;
            sendMessage(lastCmd);
        }
    }
    //cashless command reading
    if(isCmdReading) {
        _parser.putData(data);
        var cmd = _parser.getResult();
        if(cmd !== null) {
            //console.log('RECV: [' + cmd + ']');
            sendMessage([0x00]);
            processInternalState(cmd);
            _parser.clearResult();
            isCmdReading = false;
        }
    } //output just for testing
    else {
        //if(data[0] !== 0x00)
            //console.log('CMD for address: ' + data);    
    }
}

/////////////////////////////////////
//External events handlers
/////////////////////////////////////
Serial2.on('data', function(data) {
    var msg = toByteArray(data);
    //sendMessage([0x00]);
    processSerialData(msg);
});

// rfidReader.on('tag', function(error, data) {
  // if (error) {
    // print('tag read error');
  // } else {
    // cur_uid = data.uid;
    // strBalance = getUserBalance();
    // setTimeout(function () {
      // rfidReader.listen();
    // }, 1000);
  // }
// });


/////////////////////////////////////
// Mockups for testing FSM logic
/////////////////////////////////////
// var testPacketCnt = 20;
// function recvDataMockup() {
    // // Power-Up Sequence (Cashless Payment Device)
    // //CMD: RESET
    // processSerialData([0x10, 0x10]);    
    // //CMD: POLL
    // processSerialData([0x12, 0x12]);
    // //CMD: SETUP
    // processSerialData([0x11, 0x00, 0x03, 25, 2, 0x01, 0x30]);
    // //CMD: POLL
    // processSerialData([0x12, 0x12]);
    // //CMD: MAX/MIN PRICE
    // processSerialData([0x11, 0x01, 0x01, 0x01, 0x00, 0x01, 0x15]);    
    // //CMD: EXPANSION ID REQUEST    
    // // '\0x17\0x00' + '\0x00\0x00\0x01' + 'VNDX-CD-001' + '00000000001' + '\0x00\0x00\0x01'
    // processSerialData([0x17, 0x00, 0x00, 0x01, 0x01, 0x00/*11 bytes*/, 0x00/*11bytes*/, 0x00, 0x01, 0x20 /*!!!*/]);
    // //CMD: POLL
    // processSerialData([0x12, 0x12]);
    // //CMD: READER ENABLE
    // processSerialData([0x14, 0x01, 0x15]);

    // setInterval(function(){
        // if(testPacketCnt > 0) {
            // processSerialData([0x12, 0x12]);
            // testPacketCnt--;
        // }
    // }, 500);
    
	// // console.log('___________________\n' + 'Starting Vend Session');
    // // // Valid Single Vend session
    // // //CMD: POLL
    // // processSerialData([0x12, 0x12]);
    // // //CMD: ACK
    // // processSerialData([0x00]);
    // // //CMD: VEND REQUEST
    // // processSerialData([0x13, 0x00, 0x00, 0x01, 0x00, 0x01, 0x15]);
    // // //CMD: POLL
    // // processSerialData([0x12, 0x12]);
    // // //CMD: ACK
    // // processSerialData([0x00]);
    // // //CMD: VEND SUCCESS
    // // processSerialData([0x13, 0x02, 0x00, 0x01, 0x16]);
    // // //CMD: SESSION COMPLETE
    // // processSerialData([0x13, 0x04, 0x17]);
    // // //CMD: POLL
    // // processSerialData([0x12, 0x12]);
    // // //CMD: ACK
    // // processSerialData([0x00]);

    
    // //CMD: POLL (for VALIDATOR)
    // processSerialData([0x30, 0x30]);
// }

/////////////////////////////////////
//Program entry point
/////////////////////////////////////
// setTimeout(function(){
    // recvDataMockup();
// }, 1000);
