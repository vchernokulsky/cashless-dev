Serial2.setup(9600, {rx:A3, tx:A2, bytesize:9, stopbits:1});

var _MDB = require("mdb").create();
var _parser = require("MDBCmdParser").create();

var state = _MDB.CASHLESS_STATE.INACTIVE;

var isSessionCanceled = false;
var isRefundCompleted = false;
var vendPollFlag = -1;

var balanceReady = true; // FALSE!!! (TRUE for testing...)
var strBalance = "7754650";
var curBalance = 0;
var itemPrice = 0;

var lastCmd = null;

var delayCmd   = null;
var delayState = null;

I2C1.setup({sda: SDA, scl: SCL, bitrate: 400000});
var rfidReader = require("nfc").connect({i2c: I2C1, irqPin: P9});
rfidReader.wakeUp(function(error) {
  if (error) {
    print('wake up error', error);
  } else {
    print('wake up OK');
    rfidReader.listen();
    }
});
rfidReader.on('tag', function(error, data) {
  if (error) {
    print('tag read error');
  } else {
    cur_uid = data.uid;
	console.log('--> In rfidReader.on()');
    strBalance = getUserBalance();
    setTimeout(function () {
      rfidReader.listen();
    }, 1000);
  }
});

function processInternalState(data) {
  var cmd = data[0] & _MDB.MASK.COMMAND;
  console.log('MASK: ' + _MDB.MASK.COMMAND);
  console.log('PROCESS CMD ID: ' + cmd);
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
                if (delayState !== null) {
                    state = delayState;
                    delayState = null;
                }
                //console.log('(INACTIVE)|RECV:POLL ; SEND: Reader Response');                
            }
            else {
                sendMessage([0x00, 0x00]);
                lastCmd = [0x00, 0x00];
                console.log('(INACTIVE)|RECV:POLL ; SEND: JUST RESET');
            }
            break;
          case _MDB.CASHLESS_MSG.SETUP:
            // RESPONSE: Reader Response
            var sub = data[1];
            switch (sub){
                case 0x00: // Config Data
                    delayCmd = [0x01, 0x01, 0x2A, 0x11, 0x01, 0x00, 0x0A, 0x00, 0x48];
                    sendMessage(_MDB.COMMON_MSG.ACK);
                    console.log('(INACTIVE)|RECV:SETUP[Config Data] ; SEND: ACK');
                break;
                case 0x01: // Max / Min Price
                    sendMessage(_MDB.COMMON_MSG.ACK);
                    console.log('(INACTIVE)|RECV:SETUP[Max/Min Price] ; SEND: ACK');
                break;
            }
          break;
          case _MDB.CASHLESS_MSG.EXPANSION:
            var sub = data[1];
            switch(sub){
                case 0x00: // request id
                    // СФОРМИРОВАТЬ response
                    // PeripheralID;
                    delayCmd = [0x09,0x01,0x01,0x01,0x00,0x12];
                    delayState = _MDB.CASHLESS_STATE.DISABLED;
                    sendMessage(_MDB.COMMON_MSG.ACK);
                    console.log('(INACTIVE)|RECV:EXPANSION ; SEND: ACK');
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
          case _MDB.CASHLESS_MSG.EXPANSION:
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
				if (!balanceReady){
					// balance is not ready
					// Send ACK to VMC
					sendMessage([_MDB.COMMON_MSG.ACK]);
					console.log('(ENABLED)|RECV:POLL ; SEND: ACK (balance isn\'t ready)');
				} else {
					// balance value is available
					balanceArr = getBalanceArr();
					// send Begin Session
					sendMessage(balanceArr);
					lastCmd = balanceArr;
					state = _MDB.CASHLESS_STATE.IDLE; 
					console.log('(ENABLED)|RECV:POLL ; SEND: BEGIN SESSION');
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
						console.log('\n');
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        state = _MDB.CASHLESS_STATE.VEND; 
                        console.log('(IDLE)|RECV:VEND ; SEND: ACK (VEND REQUEST)');
                    break;
					case 0x01: // Cancel Vend
						sendMessage([_MDB.COMMON_MSG.ACK]);
						console.log('(IDLE)|RECV:VEND ; SEND: ACK (VEND DENIED)');
					break;
                    case 0x04: // Session Complete
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        console.log('(IDLE)|RECV:VEND ; SEND: ACK (SESSION COMPLETE)');
                    break;
					
                    // другие sub 
                }
			break;
            case _MDB.CASHLESS_MSG.POLL:
				if (isSessionCanceled){
					// send Session Cancel
					sendMessage([0x04, 0x04]);
					lastCmd = [0x04, 0x04];
					console.log('(IDLE)|RECV:SESSION_CANCEL ; SEND: 0x04 (SESSION CANCEL)');
					// Session Cancel => set to zero balance
					balanceReady = false;					
				} else {
					// send End Session
					sendMessage([0x07, 0x07]);
					lastCmd = [0x07, 0x07];
					state = _MDB.CASHLESS_STATE.ENABLED; 
					console.log('(IDLE)|RECV:POLL ; SEND: 0x07 (END SESSION)');
					// end Session => set to zero balance
					balanceReady = false;
				}
            break;   			
        }
      break;
    case _MDB.CASHLESS_STATE.VEND:
        switch (cmd){
            case _MDB.CASHLESS_MSG.POLL: 
			switch (vendPollFlag){
				case 1:
					// Coin Mechanism Pushes
					// User pushes coin mech. escrow return
					// Send VEND DENIED
					sendMessage([0x06, 0x06]);
					lastCmd = [0x06, 0x06];
					state = _MDB.CASHLESS_STATE.IDLE;
					console.log('(VEND)|RECV:POLL ; SEND: VEND DENIED');
				break;
				case 2:
					// cmd = Session Failure
					if (!isRefundCompleted){
						// refund is not completed
						// silence...	
						console.log('(VEND)|RECV:POLL  ... silence ...');
					} else {
						// refund is completed
						// balance reinstated
						sendMessage([_MDB.COMMON_MSG.ACK]);
						console.log('(VEND)|RECV:POLL ; SEND: ACK (REFUND DONE)');
					}
				break;
				case 3:
					// cmd = Session Complete
					sendMessage([0x07, 0x07]);
					lastCmd = [0x07, 0x07];
					state = _MDB.CASHLESS_STATE.ENABLED; 
					console.log('(VEND)|RECV:POLL ; SEND: 0x07 (END SESSION)');
					isSessionComplete = true;
				break;
				default:
					// No CoinMechanismPushes No SessionFailure
					// VEND APPROVED
					curBalance -= itemPrice;
					var tmp = [];
					for(var i=3; i>0; i--) {
						tmp[i] = curBalance >> 8*i;
					}
					chk = _MDB.calcChkByte([ 0x03, tmp[0], tmp[1]]);                
					// send Vend Approved
					sendMessage([0x03, tmp[0], tmp[1], chk]);
					lastCmd = [0x03, tmp[0], tmp[1], chk];
					console.log('(VEND)|RECV:POLL ; SEND: VEND APPROVED');
				break;
			}
            break; 
            case _MDB.CASHLESS_MSG.VEND:
                var sub = data[1];
                switch(sub) {
					case 0x01: // CANCEL VEND
						sendMessage([_MDB.COMMON_MSG.ACK]);
						console.log('(VEND)|RECV:VEND ; SEND: ACK (CANCEL VEND)');
					
					break;
                    case 0x02: // VEND SUCCESS
                        sendMessage([_MDB.COMMON_MSG.ACK]);
                        state = _MDB.CASHLESS_STATE.IDLE;
                        console.log('(VEND)|RECV:VEND ; SEND: ACK (VEND SUCCESS)');
                    break;
					case 0x03: // VEND FAILURE
					// flag: price is not returned
						sendMessage([_MDB.COMMON_MSG.ACK]);
						console.log('(VEND)|RECV:VEND ; SEND: ACK (VEND FAILURE)');
						//
						isRefundCompleted = false;
						// refunding ...
						curBalance += itemPrice;
						isRefundCompleted = true;
					break;
					case 0x04: // SESSION COMPLETE
						sendMessage([_MDB.COMMON_MSG.ACK]);
						console.log('(VEND)|RECV:VEND ; SEND: ACK (SESSION COMPLETE)');
						isSessionComplete = true;
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
    chk = _MDB.calcChkByte([ 0x03, tmp[0], tmp[1]]);
	var result = [0x03, tmp[0], tmp[1], chk];
	//console.log(' == begin session sequence ' + result);
	return result;	
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

function getUserBalance() {
  var content = "chip=011000000168435012"; // <-- UID
  var options = {
	host: 'sync.sportlifeclub.ru',
	port: '60080',
    path: '/slsrv/Chip/GetState',
    protocol: "http:",
    method: "POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Length":content.length
    }
  };

  console.log('Connectiong to Server ... ');
  var sBalance = '';  
  var http = require("http");
  http.request(options, function(res) {
    console.log('Connected to Server');
    res.on('data', function(data) {
      sBalance = data;
      return sBalance;
    });
    res.on('close',function(data) {
      console.log("Server connection closed");
    });    
  }).end(content);
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
    console.log('SERIAL INPUT: ' + data);
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
            sendMessage(lastCmd);
        }
    }
    //cashless command reading
    if(isCmdReading) {
        _parser.putData(data);
        var cmd = _parser.getResult();
        console.log('PARSER RETURN: ' + cmd);
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
// Serial2.on('data', function(data) {
    // console.log('RAW: ', toHexString(data));
    // var msg = toByteArray(data);
    // processSerialData(msg);
    // // var addr = msg[0] & _MDB.MASK.ADDRESS;
    // // if(addr==0x10) {
        // // _parser.putData(msg);
        // // var cmd = _parser.getResult();
        // // if(cmd !== null) {
            // // console.log('CMD: ' + cmd);
            // // processInternalState(cmd);
            // // _parser.clearResult();
        // // }
    // // }
// });


/////////////////////////////////////
// Mockups for testing FSM logic
/////////////////////////////////////
var testPacketCnt = 20;
function recvDataMockup() {
    // Power-Up Sequence (Cashless Payment Device)
    //CMD: RESET
    processSerialData([0x10, 0x10]);    
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    //CMD: SETUP
    processSerialData([0x11, 0x00, 0x03, 25, 2, 0x01, 0x30]);
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    //CMD: MAX/MIN PRICE
    processSerialData([0x11, 0x01, 0x01, 0x01, 0x00, 0x01, 0x15]);    
    //CMD: EXPANSION ID REQUEST    
    // '\0x17\0x00' + '\0x00\0x00\0x01' + 'VNDX-CD-001' + '00000000001' + '\0x00\0x00\0x01'
    //processSerialData([0x17,0x00,0x00,0x01,0x01, 0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x01, 0x20]);
	processSerialData([0x17,0x00,0x00,0x00,0x01,0x08]);
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    //CMD: READER ENABLE
    processSerialData([0x14, 0x01, 0x15]);
	/*
    setInterval(function(){
        if(testPacketCnt > 0) {
            processSerialData([0x12, 0x12]);
            testPacketCnt--;
        }
    }, 500);
    */
	
	// EXAMPLE VEND SESSION #1
	// Valid Single Vend 
	/*
	console.log('Starting Vend Session');
    // Valid Single Vend session
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    //CMD: ACK
    processSerialData([0x00]);
    //CMD: VEND REQUEST
	processSerialData([0x13, 0x00, 0x00, 0x01, 0x00, 0x01, 0x15]);
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    //CMD: ACK
    processSerialData([0x00]);
    //CMD: VEND SUCCESS
    processSerialData([0x13, 0x02, 0x00, 0x01, 0x16]);
    //CMD: SESSION COMPLETE
    processSerialData([0x13, 0x04, 0x17]);
    //CMD: POLL
    processSerialData([0x12, 0x12]);
    //CMD: ACK
    processSerialData([0x00]);
	*/
	// EXAMPLE VEND SESSION #3 
	// Session cancelled by user with reader return button
	/*
	console.log('_________________________\n' + ' Starting Vend Session #3'); 
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	// SESSION CANCELING ... (button RETURN pressed) 
	isSessionCanceled = true;
	//CMD: POLL for SESSION_CANCEL
	processSerialData([0x12, 0x12]);
	//						(button RETURN released) 	
	isSessionCanceled = false;
	//CMD: ACK
	processSerialData([0x00]);
	//CMD: SESSION COMPLETE
	processSerialData([0x13, 0x04, 0x17]);
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	//CMD: ACK
	processSerialData([0x00]);
	*/
	// EXAMPLE VEND SESSION #4a
	// Session cancelled by user via coin mechanism
	// 		escrow return button before product was selected)
	/*
	console.log('_________________________\n' + ' Starting Vend Session #4a'); 
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	//CMD: ACK
	processSerialData([0x00]);
	//CMD: SESSION COMPLETE
	processSerialData([0x13, 0x04, 0x17]);
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	//CMD: ACK
	processSerialData([0x00]);
	*/
	// EXAMPLE VEND SESSION #4b
	//Session cancelled by user via coin mechanism
	//		escrow return button after product was selected
	/*
	console.log('_________________________\n' + ' Starting Vend Session #4b'); 
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	//CMD: ACK
	processSerialData([0x00]);
	//CMD: VEND REQUEST
    processSerialData([0x13, 0x00, 0x00, 0x01, 0x00, 0x01, 0x15]);
	
	vendPollFlag = 1; // User pushes coin mech. escrow return 
	//CMD: CANCEL VEND
	processSerialData([0x13, 0x01, 0x14]);	
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	vendPollFlag = -1; // User pushes coin mech. escrow return
	
	//CMD: SESSION COMPLETE
	processSerialData([0x13, 0x04, 0x17]);
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	//CMD: ACK
	processSerialData([0x00]);	
	*/
	// EXAMPLE VEND SESSION #5
	// VMC Failure/product not dispensed refund positive
	/**/
	console.log('_________________________\n' + ' Starting Vend Session #5');
	//CMD: POLL 
    processSerialData([0x12, 0x12]);
	//CMD: ACK
	processSerialData([0x00]);
	//CMD: VEND REQUEST
    processSerialData([0x13, 0x00, 0x00, 0x01, 0x00, 0x01, 0x15]);	
	// Reader deducts purchase price from payment media	
	//CMD: POLL
    processSerialData([0x12, 0x12]);
	//VMC fails to dispense product
	// CMD: Vend Failure
	vendPollFlag = 2; // session failure
	processSerialData([0x13, 0x03, 0x14]);
	isRefundCompleted = false;
	//CMD: POLL
    processSerialData([0x12, 0x12]);
	//CMD: POLL
    processSerialData([0x12, 0x12]);
	//CMD: POLL
    processSerialData([0x12, 0x12]);
	//CMD: POLL
	isRefundCompleted = true;
    processSerialData([0x12, 0x12]);
	//CMD: SESSION COMPLETE
	vendPollFlag = 3; // session complete
	processSerialData([0x13, 0x04, 0x17]);	
	//CMD: POLL
    processSerialData([0x12, 0x12]);
	//CMD: ACK
	processSerialData([0x00]);	
	vendPollFlag = -1; // default scenario in VEND -> POLL
	// 
	/**/
    //CMD: POLL (for VALIDATOR)
    processSerialData([0x30, 0x30]);
}

/////////////////////////////////////
//Program entry point
/////////////////////////////////////
setTimeout(function(){
    recvDataMockup();
}, 1000);
