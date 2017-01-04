var CommGlolime = function CommGlolime() {
  this._eth = 'undefined';
  this._client = 'undefined';
  this._crc = 'undefined';
  this._p = 'undefined';
  this._PREAMBLE  = 0xFD;
  this._ESC       = 0xFF;
  this._POSTAMBLE = 0xFE;
  this._BEGIN_STATE  = 1;
  this._ESCSUM_STATE = 2;
  this._END_STATE    = 3;
  this._HOST = "192.168.1.101";
  // default parser state
  this._parser_state = this._BEGIN_STATE;
};

CommGlolime.prototype.setup = function(eth, client, crc, p) {
  if(eth != 'undefined') {
    this._eth = eth;
  }
  if(client != 'undefined') {
    this._client = client;
  }
  if(crc != 'undefined') {
    this._crc = crc;
  }
  if(p != 'undefined') {
    this._p = p;
  }
  //this._HOST = host;
};

CommGlolime.prototype.getBalance = function(uid, callback) {
    this._sendMsgToGloLime();
};

CommGlolime.prototype.sellProduct = function(productId, price, callback) {
  this._sendMsgToGloLime();
};

CommGlolime.prototype._getHexStr = function(data) {
  var str = '';
  for(var i=0; i<data.length; i++) {
    str += ('0x' + data[i].toString(16) + ' ');
  }
  return str;
};

// return HEX value
CommGlolime.prototype._processLitleEnd = function (array) {
  var str = "";
  var tmp = array.reverse();
  for(var i=0; i<tmp.length; i++) {
    str += tmp[i].toString(16);
  }
  return parseInt(str, 16);
};

CommGlolime.prototype._processLitleEnd1 = function (array) {
  var str = "";
  var tmp = array.reverse();
  var mask = 0x80;
  var check = tmp[0] & mask;
  if (check !== 0x00){
    return 0;
  }
  for(var i=0; i<tmp.length; i++) {
    str += tmp[i].toString(16);
  }
  return parseInt(str, 16);
};

CommGlolime.prototype._waitForServerWakeup = function () {
  logger('Server waiting...');
  stopBlinker(_vendBlinkerInterval);
  failureDevice();

  _pingInterval = startBlinker(PIN_CARD_NOT_REGISTERED, 500);
  _serverWakeupInterval = setInterval(function() {
    this._p.ping({ address: HOST, port:6767, timeout:2000, attempts:2 }, function(err, data) {
      if(data != 'undefined') {
        logger('Server started!!!');
        stopBlinker(_serverWakeupInterval);
        stopBlinker(_pingInterval); //TODO: incorrect function name
        enableDevice();
      }
      else {
        if(err != 'undefined') {
          console.log('Server does not respond');
        }
      }
    });
  }, HOST_PING_TIMEOUT);
};

// functions for cmd parser
CommGlolime.prototype._putByte = function(cmdByte, callback){
	switch(cmdByte)
	{
		case PREAMBLE:
			parser_state = this._BEGIN_STATE;
			break;
		case ESC:
			parser_state = this._ESCSUM_STATE;
			break;
		case POSTAMBLE:
			parser_state = this._END_STATE;
            this._processGloLimeResponse(buffer);
            if(callback == 'function') {
              callback();
            }
			break;
		default:
			processByte(cmdByte);
			break;
	}
};

CommGlolime.prototype._processByte = function (cmdByte){
	switch (parser_state) {
		case BEGIN_STATE:
			buffer = buffer.concat(cmdByte);
			break;
		case ESCSUM_STATE:
			buffer = buffer.concat(EscSum[cmdByte]);
			logger(' => buffer.length = ' + buffer.length);
			parser_state = BEGIN_STATE;
			break;
		case END_STATE:
			//
			break;
	}
};

CommGlolime.prototype._sendMsgToGloLime = function (msg){
    for (var i = 0; i < msg.length; i++) {
        msg_str += msg[i];
    }
    console.log('MSG STR   :: ' + msg_str);

    var refSocket = 'undefined';
    var timeoutId = setTimeout(function () {
      logger('Timeout Error');
      _failuresCount++;
      if((_failuresCount%3) === 0) {
        waitForServerWakeup();
      }
      else {
		stopBlinker(_vendBlinkerInterval);
        enableDevice();
      }

      if(refSocket != 'undefined') {
        refSocket.end();
      }
    }, 5000);

    this._client.connect({host: this._HOST, port: 6767},  function(socket) {
        console.log('Client connected');
        console.log('REQUEST :: ' + this._getHexStr(msg));
        var s = "";
        buffer = [];
        for (var i = 0; i < msg.length; i++) {
			s += String.fromCharCode(msg[i]);
		}
        refSocket = socket;
		socket.write(s);
		socket.on('data', function(data) {
            try {
              clearTimeout(timeoutId);
            } catch(ex) {
              logger("Exception: " + ex);
            }
			var isComplete = false;
			for(var i = 0; i < data.length; i++) {
              this._putByte(data.charCodeAt(i), null);
			}
		});
		socket.on('close',function(){
			console.log('Socket connection closed! ');
		});
    });
};

CommGlolime.prototype._processGloLimeResponse = function (resp){
	var cmdExitCode, comandCode, numBalance;
	comandCode = resp[2];
	console.log('RESPONSE:: ' + this._getHexStr(resp));
    if (this._crc.check(resp)){//checkCRC16_CCITT(resp)){
		switch (comandCode){
			case 0x01: // Get balance command
              logger(' ==> Process resp on | GetBalance | cmd ');
              break;
			case 0x02: // Buy command
              logger(' ==> Process resp on | makeBuy | cmd ');
              break;
			default:
              logger(' ==> Cmd code in GloLimeResp unknown ');
              break;
		}
		cmdExitCode = resp[3];
        if(cmdExitCode == ERROR_OK) {
          console.log(' ==> Operation successful');
          switch (comandCode){
            case 1:
              // getBalance command
              userIdLittleEndian = resp.slice(4,8);
              userId = this._processLitleEnd(resp.slice(4,8));
              var tempBalance = resp.slice(9,13);
              userType = resp.slice(8,9);
              console.log(' :: userType      -> ' + userType);
              numBalance = this._processLitleEnd1(tempBalance);
              if(!isNaN(numBalance)) {
                if (numBalance >= 2500) {
                  var balanceToSend = numBalance.toString(10)+"\n";
                  logger(" :: balanceToSend -> " + balanceToSend);
                  //TODO: change to balance ACK
                  Serial4.write(balanceToSend);
                  _internalCommTimeout = setTimeout(function(){
                    logger('ERROR: Balance ACK timeout');
                    stopBlinker(_vendBlinkerInterval);
                    enableDevice();
                  }, 2000);
                } else {
                  console.log("Attention:: Not enought money");
                  stopBlinker(_vendBlinkerInterval);
                  enableDevice();
                  singleBlink(PIN_NOT_ENOUGHT_MONEY, 5000);
                }
              } else {
                logger("Recieved incorrect data: " + numBalance);
                stopBlinker(_vendBlinkerInterval);
                enableDevice();
              }
              break;
            case 2:
              // Buy command
              enableDevice();
              break;
            default:
              enableDevice();
              break;
          }
        }
        else {
          stopBlinker(_vendBlinkerInterval);
          enableDevice();
          switch (cmdExitCode){
              case ERROR_INVALID_CRC:
                console.log('ERROR: CRC incorrect');
                isVendDone = true;
              break;
              case ERROR_INVALID_COMMAND:
                  console.log('ERROR: Cmd incorrect');
              break;
              case ERROR_INVALID_PARAMETER:
                  console.log('ERROR: Cmd parament incorrect');
              break;
              case ERROR_INVALID_CRC:
                  console.log('ERROR: CRC INCORRECT');
              break;
              case ERROR_INVALID_COMMAND:
                  console.log('ERROR: CMD INCORRECT');
              break;
              case ERROR_INVALID_PARAMETER:
                  console.log('ERROR: CMD PARAMENT INCORRECT');
              break;
              case ERROR_INSUFFICIENT_FUNDS:
                  console.log('ERROR: INSUFFICIENT FUNDS ');
                  singleBlink(PIN_NOT_ENOUGHT_MONEY,5000);
              break;
              case ERROR_NON_EXISTENT_PRODUCT:
                  console.log('ERROR: PRODUCT DOES NOT EXIST');
              break;
              case ERROR_NON_EXISTENT_USER:
                  console.log('ERROR: USER DOES NOT EXIST');
              break;
              case ERROR_NON_EXISTENT_SALE:
                  console.log('ERROR: SALE DOES NOT EXIST');
              break;
              case ERROR_NOT_REGISTERED_CARD:
                  console.log('ERROR: CARD DOES NOT REGISTERED');
                  singleBlink(PIN_CARD_NOT_REGISTERED, 5000);
              break;
              default:
                  console.log('Unknown comand exit code');
              break;
          }
        }
	}
};