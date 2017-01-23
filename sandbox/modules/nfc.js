var PN532 = function(connect) {

  connect = connect || {};

  this._irqPin = connect.irqPin;

  this._i2c = connect.i2c;

  this._packetBuffer = new Uint8Array(48);
  this._classicPacketBuffer = new Uint8Array(64);
  this._imWaitingFor = new Array();
  this._maxPage = 48;

  this._PREAMBLE = 0x00;
  this._STARTCODE2 = 0xFF;
  this._POSTAMBLE = 0x00;
  this._HOSTTOPN532 = 0xD4;
  this._COMMAND_GETFIRMWAREVERSION = 0x02;
  this._COMMAND_SAMCONFIGURATION = 0x14;
  this._COMMAND_INLISTPASSIVETARGET = 0x4A;
  this._COMMAND_INDATAEXCHANGE = 0x40;
  this._SPI_DATAWRITE = 0x01;
  this._SPI_DATAREAD = 0x03;
  this._MIFARE_ULTRALIGHT_CMD_WRITE = 0xA2;

  this._MIFARE_CMD_AUTH_A = 0x60;
  this._MIFARE_CMD_AUTH_B = 0x61;  
  
  this._MIFARE_CMD_READ = 0x30;
  this._PN532_I2C_ADDRESS = 0x48 >> 1;
};

PN532.prototype.wakeUp = function(callback) {

  setWatch(this._handleIrq.bind(this), this._irqPin, {repeat: true});

  this._packetBuffer[0] = this._COMMAND_GETFIRMWAREVERSION;
  this._sendCommandCheckAck(this._packetBuffer, 1);
  this._imWaitingFor.push(this._SAMConfig.bind(this, callback));
};

PN532.prototype._handleIrq = function(e) {
  if (e.state === false) {
    var irqWasFor = this._imWaitingFor.splice(0, 1);
    if (typeof irqWasFor[0] === 'function') {
      irqWasFor[0]();
    }
  }
};

PN532.prototype._sendCommandCheckAck = function(cmd, cmdlen) {
  cmdlen++;
  var toSend = [
    //this._SPI_DATAWRITE,
    this._PREAMBLE,
    this._PREAMBLE,
    this._STARTCODE2,
    cmdlen,
    ~cmdlen + 1,
    this._HOSTTOPN532
  ];
  var checksum = new Uint8Array(1);
  checksum[0] = this._PREAMBLE + this._PREAMBLE
            + this._STARTCODE2 + this._HOSTTOPN532;

  for (var i = 0; i < cmdlen - 1; i++) {
    toSend.push(cmd[i]);
    checksum[0] += cmd[i];
  }
  toSend.push(~checksum[0]);
  toSend.push(this._POSTAMBLE);

  var send = new Uint8Array(toSend, 0, 9 + cmdlen);
  
  this._i2c.writeTo(this._PN532_I2C_ADDRESS, send);
  this._imWaitingFor.push(this._readACK.bind(this));
};

PN532.prototype._SAMConfig = function(callback) {
  this._packetBuffer[0] = this._COMMAND_SAMCONFIGURATION;
  this._packetBuffer[1] = 0x01; // normal mode;
  this._packetBuffer[2] = 0x14; // timeout 50ms * 20 = 1 second
  this._packetBuffer[3] = 0x01; // use IRQ pin!

  this._sendCommandCheckAck(this._packetBuffer, 4);
  this._imWaitingFor.push(this._SAMConfigACK.bind(this, callback));
};

PN532.prototype._SAMConfigACK = function(callback) {
  this._packetBuffer = this._read(9);
  if (callback !== undefined) {
    callback(this._packetBuffer[7] !== 0x15);
  }
};

PN532.prototype.listen = function() {
  var buffer = new Uint8Array([this._COMMAND_INLISTPASSIVETARGET, 1, 0]);
  this._sendCommandCheckAck(buffer, 3);
  this._imWaitingFor.push(this._listenACK.bind(this));
};

PN532.prototype._listenACK = function() {
  this._packetBuffer = this._read(20);
  if (this._packetBuffer[8] !== 1) {
    this.emit('tag', {success: false});
    return;
  }
  var ATQA = this._packetBuffer[10];
  ATQA <<= 8;
  ATQA |= this._packetBuffer[11];
  var uid = new Array(this._packetBuffer[13]);
  for (var i = 0; i < this._packetBuffer[13]; i++) {
    uid[i] = this._packetBuffer[14+i];
  }
  this.emit('tag', false, {uid: uid, ATQA: ATQA});
};

PN532.prototype._getHexStr = function (data) {
  var str = '';
  for(var i=0; i<data.length; i++) {
    str += ('0x' + data[i].toString(16) + ' ');
  }
  return str;
};

PN532.prototype.authBlock = function(uid, blockNumber, keyNumber, keyData, callback) {
  // Prepare the authentication command //
  this._classicPacketBuffer[0] = this._COMMAND_INDATAEXCHANGE;   /* Data Exchange Header */
  this._classicPacketBuffer[1] = 1;                              /* Max card numbers */
  this._classicPacketBuffer[2] = (keyNumber) ? this._MIFARE_CMD_AUTH_B : this._MIFARE_CMD_AUTH_A;
  this._classicPacketBuffer[3] = blockNumber;                    /* Block Number (1K = 0..63, 4K = 0..255 */
    
  for(var i = 0; i < keyData.length; i++) {
    this._classicPacketBuffer[4+i] = keyData[i];
  }
  
  for (var i = 0; i < uid.length; i++) {
    this._classicPacketBuffer[10+i] = uid[i];                /* 4 byte card ID */
  }
  
  this._sendCommandCheckAck(this._classicPacketBuffer, 10+uid.length);
  this._imWaitingFor.push(this._readAuthAck.bind(this, callback));  
};

PN532.prototype._readAuthAck = function(callback) {
  var error = true;
  var buffer = [];
  buffer = this._read(12);  
  // check if the response is valid and we are authenticated???
  // for an auth success it should be bytes 5-7: 0xD5 0x41 0x00
  // Mifare auth error is technically byte 7: 0x14 but anything other and 0x00 is not good
  if (buffer[8] !== 0x00) {
    if (callback !== undefined) {
      callback(error, buffer);
    }
    return;
  }
  callback(!error, buffer);
};

PN532.prototype.readBlock = function(blockNumber, callback) {
  /* Prepare the command  */
  this._classicPacketBuffer[0] = this._COMMAND_INDATAEXCHANGE;
  this._classicPacketBuffer[1] = 1;                      	/* Card number */
  this._classicPacketBuffer[2] = this._MIFARE_CMD_READ;         /* Mifare Read command = 0x30 */
  this._classicPacketBuffer[3] = blockNumber;            	/* Block Number (0..63 for 1K, 0..255 for 4K) */  
  /* Send the command */
  this._sendCommandCheckAck(this._classicPacketBuffer, 4);
  this._imWaitingFor.push(this._readBlockAck.bind(this, callback));
};

PN532.prototype._readBlockAck = function(callback) {
  var error = true;
  this._classicPacketBuffer = this._read(26);

  if (this._classicPacketBuffer[8] !== 0x00) {
    if (callback !== undefined) {
      callback(error, this._classicPacketBuffer);
    }
    return;
  }
  var buffer = this._classicPacketBuffer.slice(9, 25);
  callback(!error, buffer);
};

PN532.prototype.readPage = function(page, callback) {
  if (page >= this._maxPage) {
    if (callback !== undefined) {
      callback(true);
    }
    return;
  }
  this._packetBuffer[0] = this._COMMAND_INDATAEXCHANGE;
  this._packetBuffer[1] = 1;               // Card number
  this._packetBuffer[2] = this._MIFARE_CMD_READ; // Mifare Read command = 0x30
  this._packetBuffer[3] = page;            // Page Number (0..63 in most cases)

  this._sendCommandCheckAck(this._packetBuffer, 4);
  this._imWaitingFor.push(this._readPageACK.bind(this, callback));
};

PN532.prototype._readPageACK = function(callback) {
  var error = true;
  this._packetBuffer = this._read(26);
  if (this._packetBuffer[8] !== 0x00) {
    if (callback !== undefined) {
      callback(error);
    }
    return;
  }
  var buffer = this._packetBuffer.slice(9, 13);
  callback(!error, buffer);
};

PN532.prototype.writePage = function(page, data, callback) {
  if (page >= this._maxPage) {
    if (callback !== undefined) {
      callback(true);
    }
    return;
  }

  this._packetBuffer[0] = this._COMMAND_INDATAEXCHANGE;
  this._packetBuffer[1] = 1; /* Card number */
  this._packetBuffer[2] = this._MIFARE_ULTRALIGHT_CMD_WRITE;
  this._packetBuffer[3] = page;
  this._packetBuffer[4] = data[0];
  this._packetBuffer[5] = data[1];
  this._packetBuffer[6] = data[2];
  this._packetBuffer[7] = data[3];
  this._sendCommandCheckAck(this._packetBuffer, 8);

  this._imWaitingFor.push(this._writePageACK.bind(this, callback));
};

PN532.prototype._writePageACK = function(callback) {
  this._packetBuffer = this._read(26);
  if (callback !== undefined) {
    callback(false, this._packetBuffer);
  }
};

PN532.prototype._read = function(length) {
  var buffer = new Uint8Array(length);
  buffer.fill(this._SPI_DATAREAD);
  var data = this._i2c.readFrom(this._PN532_I2C_ADDRESS, length+1);
  return data;
};

PN532.prototype._readACK = function() {
  var ackBuff = this._read(6);
  var pn532ack = new Uint8Array([0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00]);
  return pn532ack === ackBuff;
};

exports.connect = function(opts) {
  return new PN532(opts);
};