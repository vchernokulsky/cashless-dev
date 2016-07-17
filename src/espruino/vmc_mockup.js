Serial4.setup(115200);

var isLed = true;
var count = 0;

function powerup_sequence(){
	///Power-Up Sequence (Cashless Payment Device)
    //CMD: RESET
    send_mdb_cmd([0x10, 0x10]);    
	console.log("CMD: RESET");
    //CMD: POLL
    send_mdb_cmd([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: SETUP
    send_mdb_cmd([0x11, 0x00, 0x03, 25, 2, 0x01, 0x30]);
	console.log("CMD: SETUP");
    //CMD: POLL
    send_mdb_cmd([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: MAX/MIN PRICE
    send_mdb_cmd([0x11, 0x01, 0x01, 0x01, 0x00, 0x01, 0x15]);
	console.log("CMD: MAX/MIN PRICE");    
    //CMD: EXPANSION ID REQUEST    
    send_mdb_cmd([0x17, 0x00, 0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3]);
	console.log("CMD: EXPANSION ID REQUEST");  
    //CMD: POLL
    send_mdb_cmd([0x12, 0x12]);
	console.log("CMD: POLL");  
    //CMD: READER ENABLE
    send_mdb_cmd([0x14, 0x01, 0x15]);
	console.log("CMD: READER ENABLE");  
}

function vendsuccess_sequence(){
	console.log('Starting Vend Session');
    // Valid Single Vend session
    //CMD: POLL
    send_mdb_cmd([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: ACK
    Serial4.write([0x00]);
	console.log("CMD: ACK");
    //CMD: VEND REQUEST
    send_mdb_cmd([0x13, 0x00, 0x00, 0x01, 0x00, 0x01, 0x15]);
	console.log("CMD: VEND REQUEST");
    //CMD: POLL
    send_mdb_cmd([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: ACK
    Serial4.write([0x00]);
	console.log("CMD: ACK");
    //CMD: VEND SUCCESS
    send_mdb_cmd([0x13, 0x02, 0x00, 0x01, 0x16]);
	console.log("CMD: VEND SUCCESS");
    //CMD: SESSION COMPLETE
    send_mdb_cmd([0x13, 0x04, 0x17]);
	console.log("CMD: SESSION COMPLETE");
    //CMD: POLL
    send_mdb_cmd([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: ACK
    Serial4.write([0x00]);
	console.log("CMD: ACK");
}

function send_mdb_cmd(data) {
    var addr = 0x40004404;
    var first = 0x0100 | data[0];
    poke16(addr, first);    
    Serial4.write(data.slice(1, data.length-1));
}

pinMode(A4, "input_pullup");
pinMode(A5, "input_pullup");
//POWERUP sender
setWatch(function(){
    console.log(' --> Starting Powerup Sequence');
    powerup_sequence();
}, A4, {repeat: true, edge: 'falling', debounce: 10});

//VEND SUCCESS sender
setWatch(function(){
    console.log(' --> Starting Vend Success Session');
    vendsuccess_sequence();
}, A5, {repeat: true, edge: 'falling', debounce: 10});


/*
setWatch(function(){
    count++;
    isLed = !isLed;
    if(!isLed) {
        LED1.set();
    } else {
        LED1.reset();
    }
    switch (count){
        case 1: // POWERUP sequence
			console.log(' --> Starting Powerup Sequence');
            powerup_sequence();
            break;
        case 2: // Vend Sinle Success Session
			console.log(' --> Starting Vend Success Session');
            vendsuccess_sequence();            
            break;
		default:
			console.log(' --> Counter reset');
			count=0;
			break;
    }
}, BTN1, {
    repeat: true,
    edge: 'falling',
    debounce: 10});
*/