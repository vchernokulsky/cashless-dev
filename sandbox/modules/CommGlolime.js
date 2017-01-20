var CommGlolime = function CommGlolime() {
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
  this._frameID = 0x00;
  this._ADDR = 0x01;
  this._BALANCE_CMD = 0x01;
  this._SELL_CMD = 0x02;
  this._buffer = new Array(0);
  this._EscSum = new Uint8Array([0xFF, 0xFE, 0xFD]);
  this._ERROR_OK = 0x00;
  this._ERROR_TIMEOUT = 0xF1;
  ///
  this._failuresCount = 0;
};

CommGlolime.prototype.setup = function(client, host, crc, p) {
  if(client != 'undefined') {
    this._client = client;
  }
  if(host != 'undefined') {
    this._HOST = host;
  }
  if(crc != 'undefined') {
    this._crc = crc;
  }
  if(p != 'undefined') {
    this._p = p;
  }
};

CommGlolime.prototype._getHexStr = function(data) {
    var str = '';
    for(var i=0; i<data.length; i++) {
        str += ('0x' + data[i].toString(16) + ' ');
    }
    return str;
};

CommGlolime.prototype.getBalance = function(cardType, strCardUid) {
  var cardUid  = this._processUidToSend(strCardUid);
  var cmdData = [];
  cmdData = [cardType].concat(cardUid);
  var msg = [];
  msg = this._makeCmdFrame(this._ADDR, this._BALANCE_CMD, cmdData);
  this._sendMsgFrame(msg);
};

CommGlolime.prototype.sellProduct = function(strId, strPrice, strUserId) {
  var productId = this._uintToByteArray(parseInt(strId, 10)+1);
  var productPrice = this._uintToByteArray(parseInt(strPrice, 10));
  var userId = this._uintToByteArray(parseInt(strUserId, 10));
  var cmdData = [];
  var prodIdToSend = [];
  prodIdToSend[0] = productId[0];
  prodIdToSend[1] = productId[1];
  prodIdToSend[2] = 0x00;
  prodIdToSend[3] = 0x00;
  var prodPriceToSend = [];
  prodPriceToSend[0] = productPrice[0];
  prodPriceToSend[1] = productPrice[1];
  prodPriceToSend[2] = 0x00;
  prodPriceToSend[3] = 0x00;
  var userIdToSend = [];
  userIdToSend[0] = userId[0];
  userIdToSend[1] = userId[1];
  userIdToSend[2] = userId[2];
  userIdToSend[3] = userId[3];
  cmdData = (userIdToSend.concat(prodIdToSend).concat(prodPriceToSend));
  var msg = [];
  msg = this._makeCmdFrame(this._ADDR, this._SELL_CMD, cmdData);
  this._sendMsgFrame(msg);
};

CommGlolime.prototype._uintToByteArray = function(/*long*/long) {
    // we want to represent the input as a 8-bytes array
    var byteArray = [0, 0, 0, 0];
    for ( var index = 0; index < byteArray.length; index ++ ) {
        var byte = long & 0xff;
        byteArray [ index ] = byte;
        long = (long - byte) / 256 ;
    }
    return byteArray;
};

CommGlolime.prototype._processUidToSend = function(uid){
    var str = "", result = [], temp = "";
    for (var i = 0; i < uid.length; i++) {
        temp = uid[i].toString(16);
        if (temp.length < 2) {
            temp = "0" + temp;
        }
        str += temp;
    }
    for (var j = 0; j < str.length; j++) {
        result[j] = str.charCodeAt(j);
    }
    result[result.length] = 0;
    return result;
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
    temp = tmp[i].toString(16);
    if (temp.length < 2) {
        temp = "0" + temp;
    }
    str += temp;
    console.log("tmp[i] = " + tmp[i]);
    console.log("tmp[i].toString(16) = " + tmp[i].toString(16));
    console.log("str = " + str);
  }
  return parseInt(str, 16);
};

// functions for cmd parser
CommGlolime.prototype._putByte = function(cmdByte) {
	switch(cmdByte)
	{
		case this._PREAMBLE:
			this._parser_state = this._BEGIN_STATE;
			break;
		case this._ESC:
			this._parser_state = this._ESCSUM_STATE;
			break;
		case this._POSTAMBLE:
			this._parser_state = this._END_STATE;
            this._processResponseFrame(this._buffer);
			break;
		default:
			this._processByte(cmdByte);
			break;
	}
};

CommGlolime.prototype._processByte = function (cmdByte){
	switch (this._parser_state) {
		case this._BEGIN_STATE:
			this._buffer = this._buffer.concat(cmdByte);
			break;
		case this._ESCSUM_STATE:
			this._buffer = this._buffer.concat(this._EscSum[cmdByte]);
			console.log(' => this._buffer.length = ' + this._buffer.length);
			this._parser_state = this._BEGIN_STATE;
			break;
		case this._END_STATE:
			//
			break;
	}
};

CommGlolime.prototype._escapeSpecialBytes = function(array){
  var result = [];
  for (var i = 0; i < array.length; i++){
    switch(array[i]){
      case 255: // 0xFF -> 0xFF 0x00
        result = result.concat(255, 0);
        break;
      case 254: // 0xFE -> 0xFF 0x01
        result = result.concat(255, 1);
        break;
      case 253: // 0xFD -> 0xFF 0x02
        result = result.concat(255, 2);
        break;
      default:
        result = result.concat(array[i]);
        break;
    }
  }
  return result;
};

CommGlolime.prototype._makeCmdFrame = function(_addr, _cmdCode, cmdData){
    var size = 3 + cmdData.length;
    var array = [];
    var array_bf = [];
    var result = [];

    array[0] = _addr;
    array[1] = this._frameID;
    array[2] = _cmdCode;

    var i = 0, j = 3;
    for (i = 0, j = 3; i < cmdData.length; i++, j++) {
        array[j] = cmdData[i];
    }

    var checksum = this._crc.calculate(array);
    array_bf = this._escapeSpecialBytes(array);
    var tmp1 = (checksum >> 8);
    var tmp2 = (checksum & 0x00FF);
    array_bf[array_bf.length] = tmp2;
    array_bf[array_bf.length] = tmp1;

    result = ([this._PREAMBLE].concat(array_bf)).concat([this._POSTAMBLE]);
    return result;
};

CommGlolime.prototype._sendMsgFrame = function (msg){
    var owner = this;
    var refSocket = 'undefined';
    var timeoutId = setTimeout(function () {
      clearTimeout(timeoutId);
      owner._failuresCount++;
      console.log('_sendMsgFrame:: Timeout Error');
      try {
        if(refSocket != 'undefined') {
          console.log("END SOCKET");
          refSocket.end();
        }
      } catch(ex) {
          console.log('Socket interrupt exception: ' + ex);
      }
      owner.emit('error',{message: owner._ERROR_TIMEOUT});
     }, 5000);
    console.log("Connecting...");
    this._client.connect({host: this._HOST, port: 6767},  function(socket) {
        console.log('Client connected');
        console.log('REQUEST :: ' + owner._getHexStr(msg));
        var s = "";
        this._buffer = [];
        for (var i = 0; i < msg.length; i++) {
			s += String.fromCharCode(msg[i]);
		}
        refSocket = socket;
		socket.write(s);
        owner._frameID++;
		socket.on('data', function(data) {
            try {
              clearTimeout(timeoutId);
            } catch(ex) {
              console.log("Exception: " + ex);
            }
			for(var i = 0; i < data.length; i++) {
              owner._putByte(data.charCodeAt(i));
			}
		});
		socket.on('close', function() {
			console.log('Socket connection closed!');
		});
        socket.on('error', function(details) {
            console.log('Socket error:');
            console.log(details);
        });
    });
};

CommGlolime.prototype._processResponseFrame = function (resp){
	console.log('RESPONSE:: ' + this._getHexStr(resp));
    if (this._crc.check(resp)) {
		var exitCode = resp[3];
        if(exitCode == this._ERROR_OK) {
          console.log(' ==> Operation successful');
          var cmdCode = resp[2];
          switch (cmdCode) {
            case 1:
              // getBalance command
              var userId = this._processLitleEnd(resp.slice(4,8));
              var userType = resp.slice(8,9);
              var balance = this._processLitleEnd1(resp.slice(9,13));
              var data = {message: exitCode,"userId":userId, "userType":userType, "balance":balance};
              this._buffer = [];
              this.emit('balance',data);
              break;
            case 2:
              this._buffer = [];
              this.emit('sell',{message: "Sell done"});
              break;
            default:
              this._buffer = [];
              var smsg = "Unknowm glolime response exit code: \n" + cmdCode;
              this.emit('error',{message: smsg});
              break;
          }
        }
        else {
          this._buffer = [];
          this.emit('error',{message: exitCode});
        }
	}
};

// Export method for create object
exports.create = function() {
    return new CommGlolime();
};