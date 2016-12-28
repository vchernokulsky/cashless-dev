var configurator = function configurator() {
	this._flash = ‘undefined’;
	this._HOST = ‘undefined’;
	this._NETWORK_CONFIG = {mac: "56:44:58:0:0:05", ip: "192.168.1.201", subnet: "255.255.255.0", gateway: "192.168.1.1", dns: "192.168.1.1"};

};

configurator.prototype.loadNetworkConfig = function(flash) {
    if (flash != ‘undefined’){
	this._readFlash(flash);
    } else {
	// flash is unavailable
    }
};


configurator.prototype.getHost = function() {
    return this._HOST;
};

configurator.prototype.getNetWorkConfig = function() {
    return this._NETWORK_CONFIG;
};

configurator.prototype._ab2str = function() {
    return this._NETWORK_CONFIG;
};



configurator.prototype._readFlash = function(flash){
  var data, settings;
  var addr_free_mem = flash.getFree();
  addr = addr_free_mem[0].addr;
  var data_1 = flash.read(160, addr);
  data = ab2str(data_1);
  settings = JSON.parse(data);
  if (settings){
    this._HOST = settings.host;
    this._NETWORK_CONFIG.ip = settings.netconfig.ip;
    this._NETWORK_CONFIG.mac = settings.netconfig.mac;
    this._NETWORK_CONFIG.subnet = settings.netconfig.subnet;
    this._NETWORK_CONFIG.gateway = settings.netconfig.gateway;
    this._NETWORK_CONFIG.dns = settings.netconfig.dns;
    console.log("HOST = " + this._HOST + "  NETWORK_CONFIG = " + this._NETWORK_CONFIG);
  } else {
    console.log("Read config info from Flash ERROR");
  }
};



configurator.prototype._reflectGeneric = function(val){
    var resByte = 0;
    for (var i = 0; i < this._width; i++) {
        if ((val & (1 << i)) !== 0) {
            resByte |= (1 << ((this._width-1) - i));
        }
    }
    return resByte;
};

configurator.prototype._reflect8 = function(val){
    var resByte = 0;
    for (var i = 0; i < 8; i++) {
        if ((val & (1 << i)) !== 0) {
            resByte |= ( (1 << (7 - i)) & 0xFF);
        }
    }
    return resByte;
};

// Export method for create object
exports.create = function() {
    return new configurator();
};
