var logger = {
    serial = null;
};

ComplexLogger(serial) {
    logger.serial = serial;  
};

ComplexLogger.prototype.log(msg) {
    if(logger.serial !== null) {
        logger.serial.write(msg);
    } else {
        console.log(msg);
    }
}

export.create = function(serial) {
    var result = new Complex(serial);
    return new ComplexLogger();
};