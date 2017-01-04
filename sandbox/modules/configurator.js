var configurator = function configurator() {
	this._flash = 'undefined';
	this._HOST = '192.168.1.101';
    this._CFG_LENGTH = 192;
	this._NETWORK_CONFIG = {mac: "56:44:58:0:0:05", ip: "192.168.1.201", subnet: "255.255.255.0", gateway: "192.168.1.1", dns: "192.168.1.1"};

};
// ERROR CODES:
// 0 - Ok
// 1 - Read config info from Flash ERROR :: json parse error

configurator.prototype.setup = function(flash) {
    this._flash = flash;
}

configurator.prototype.getHost = function() {
    return this._HOST;
};

configurator.prototype.getNetworkConfig = function() {
    return this._NETWORK_CONFIG;
};

configurator.prototype.loadNetworkConfig = function() {
    var result  = this._readFlash();
    return result;
};

configurator.prototype.saveNetworkConfig = function(str){
    var result = 0;
    try {
        var jsonData = JSON.parse(str);
        if (jsonData != 'undefined') {
            if ((jsonData.host != 'undefined')&&(jsonData.netconfig != 'undefined')&&(jsonData.netconfig.ip != 'undefined')&&(jsonData.netconfig.mac != 'undefined')&&(jsonData.netconfig.subnet != 'undefined')&&(jsonData.netconfig.gateway != 'undefined')&&(jsonData.netconfig.dns != 'undefined')){
                result = this._writeInFlash(str);
            } else {
                // json parse error
                result = 1;
            }
            
        } else {
            // json parse error
            result = 1;
        }
    }
    catch(x){
        console.log(x);
        result = 1;
    }
    return result;
};

configurator.prototype._ab2str = function(buf) {
    var str = "";
    for (var i = 0; i < buf.length; i++){
      str+=String.fromCharCode(buf[i]);
    }
    return str;
};

configurator.prototype._str2ab = function(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  var strLen=str.length;
  for (var i=0; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

configurator.prototype._readFlash = function(){
    var data, settings;
    var addr_free_mem = this._flash.getFree();
    addr = addr_free_mem[0].addr;
    var data_1 = this._flash.read(this._CFG_LENGTH, addr);
    data = this._ab2str(data_1);
    settings = JSON.parse(data);
    if (settings){
        this._HOST = settings.host;
        this._NETWORK_CONFIG = settings.netconfig;
        // Ok
        return 0;
    } else {
        return 1;
    }
};

configurator.prototype._writeInFlash = function(cmdSerial6){
  var toWriteInFlash = new Uint8Array(0);
  toWriteInFlash = this._str2ab(cmdSerial6);
	var l = toWriteInFlash.length + (4-toWriteInFlash.length%4);
	var buf = new Uint8Array(l);
	var i;
	for (i = 0; i<l;i++){
      if (i>toWriteInFlash.length)
		buf[i] = 0;
      else
		buf[i] = toWriteInFlash[i];
	}
	var addr_free_mem = this._flash.getFree();
	var addr = addr_free_mem[0].addr;
	this._flash.erasePage(addr);
	this._flash.write(buf, addr);
    return 0;
};

// Export method for create object
exports.create = function() {
    /*
    var configurator = new configurator();
    if(flash != 'undefined')
        configurator._flash = flash;
     */
    return new configurator();
};
