var indication = function indication() {
    this._PIN_DEV_READY = null;
    this._PIN_NOT_ENOUGHT_MONEY = null;
    this._PIN_CARD_NOT_REGISTERED = null;
    this._carouselTimeout = 'undefined';
};

indication.prototype.setup = function(PIN1, PIN2, PIN3){
    this._PIN_DEV_READY = PIN1;
    this._PIN_NOT_ENOUGHT_MONEY = PIN2;
    this._PIN_CARD_NOT_REGISTERED = PIN3;
};

indication.prototype._switchLed = function(led, state) {
    if(state) {
        led.set();
    }
    else {
        led.reset();
    }
};

indication.prototype._carouselTimeouts = function(indicationData){
    this._carouselTimeout = setTimeout(function(data1) {
        data1.owner._PIN_DEV_READY.reset();
        data1.owner._PIN_NOT_ENOUGHT_MONEY.set();
        data1.owner._carouselTimeout = setTimeout(function(data2) {
            data2.owner._PIN_NOT_ENOUGHT_MONEY.reset();
            data2.owner._PIN_CARD_NOT_REGISTERED.set();
            data2.owner._carouselTimeout = setTimeout(function(data3){
                data3.owner._carouselTimeouts(data3);
            }, 250, indicationData);
        }, 250, indicationData);
    }, 250, indicationData);
};

indication.prototype.disableDevice =  function() {
    this._PIN_DEV_READY.reset();
    this._PIN_NOT_ENOUGHT_MONEY.reset();
    this._PIN_CARD_NOT_REGISTERED.reset();
};

indication.prototype.enableDevice = function() {
    this._PIN_DEV_READY.set();
    this._PIN_NOT_ENOUGHT_MONEY.reset();
    this._PIN_CARD_NOT_REGISTERED.reset();
};

indication.prototype.failureDevice = function() {
    this._PIN_DEV_READY.set();
    this._PIN_NOT_ENOUGHT_MONEY.set();
    this._PIN_CARD_NOT_REGISTERED.set();
};

indication.prototype.blinkCarousel = function() {
    this._PIN_CARD_NOT_REGISTERED.reset();
    this._PIN_DEV_READY.set();
    var indicationData = {owner: this};
    this._carouselTimeouts(indicationData);
};

indication.prototype.stopCarousel = function() {
    if(this._carouselTimeout != 'undefined') {
        var intervalId = this._carouselTimeout;
        clearTimeout(intervalId);
        this._carouselTimeout = 'undefined';
    }
};

indication.prototype.singleBlink = function(led, timeout){
    this._switchLed(led, true);
    setTimeout(function(){
         this._switchLed(led, false);
    }, timeout);
};

indication.prototype.startBlinker = function(led, period) {
    var blinkFlag = false;
    var intervalId = setInterval(function(){
         blinkFlag = !blinkFlag;
         this._switchLed(led, blinkFlag);
    }, period, blinkFlag);
    return intervalId;
};

// return 'undefined' value
indication.prototype.stopBlinker = function(intervalId) {
    if(intervalId != 'undefined') {
        clearInterval(intervalId);
        intervalId = 'undefined';
    }
    return intervalId;
};

indication.prototype.resetPIN = function(PIN){
    PIN.reset();
};

// Export method for create object
exports.create = function() {
    return new indication();
};
