function MDB() {
};

MDB.prototype.MASK = {
    ADDRESS: 0xF8,
    COMMAND: 0x07
};

MDB.prototype.ADDRESS = {
    VMC:       0x00,
    CHANGER:   0x08,
    CASHLESS1: 0x10,
    GATEWAY:   0x18,
    DISPLAY:   0x20,
    EMS:       0x28,
    VALIDATOR: 0x30
};

MDB.prototype.COMMON_MSG = {
    ACK: 0x00,
    RET: 0xAA,
    NAK: 0xFF
};

MSDB.prototyp.CASHLESS_MSG = {
    RESET:   0x00,
    SETUP:   0x01,
    POLL:    0x02,
    VEND:    0x03,
    READER:  0x04,
    REVALUE: 0x05,
    EXTRA:   0x07
};

exports.create = function() {
    return new MDB();
};