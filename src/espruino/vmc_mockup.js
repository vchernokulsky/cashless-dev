Serial4.setup(115200);

var isLed = true;
var count = 0;

function powerup_sequence(){
	///Power-Up Sequence (Cashless Payment Device)
    //CMD: RESET
    Serial4.write([0x10, 0x10]);    
	console.log("CMD: RESET");
    //CMD: POLL
    Serial4.write([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: SETUP
    Serial4.write([0x11, 0x00, 0x03, 25, 2, 0x01, 0x30]);
	console.log("CMD: SETUP");
    //CMD: POLL
    Serial4.write([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: MAX/MIN PRICE
    Serial4.write([0x11, 0x01, 0x01, 0x01, 0x00, 0x01, 0x15]);
	console.log("CMD: MAX/MIN PRICE");    
    //CMD: EXPANSION ID REQUEST    
    Serial4.write([0x17, 0x00, 0x4F,0x4D,0x30,0x30,0x30,0x30,0x30,0x30,0x31,0x34,0x35,0x33,0x38,0x36,0x4E,0x45,0x57,0x5F,0x45,0x55,0x52,0x4F,0x4B,0x45,0x59,0x20, 0x02,0x01, 0xD3]);
	console.log("CMD: EXPANSION ID REQUEST");  
    //CMD: POLL
    Serial4.write([0x12, 0x12]);
	console.log("CMD: POLL");  
    //CMD: READER ENABLE
    Serial4.write([0x14, 0x01, 0x15]);
	console.log("CMD: READER ENABLE");  
}

function vendsuccess_sequence(){
	console.log('Starting Vend Session');
    // Valid Single Vend session
    //CMD: POLL
    Serial4.write([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: ACK
    Serial4.write([0x00]);
	console.log("CMD: ACK");
    //CMD: VEND REQUEST
    Serial4.write([0x13, 0x00, 0x00, 0x01, 0x00, 0x01, 0x15]);
	console.log("CMD: VEND REQUEST");
    //CMD: POLL
    Serial4.write([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: ACK
    Serial4.write([0x00]);
	console.log("CMD: ACK");
    //CMD: VEND SUCCESS
    Serial4.write([0x13, 0x02, 0x00, 0x01, 0x16]);
	console.log("CMD: VEND SUCCESS");
    //CMD: SESSION COMPLETE
    Serial4.write([0x13, 0x04, 0x17]);
	console.log("CMD: SESSION COMPLETE");
    //CMD: POLL
    Serial4.write([0x12, 0x12]);
	console.log("CMD: POLL");
    //CMD: ACK
    Serial4.write([0x00]);
	console.log("CMD: ACK");
}

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
    
Serial2.on('data',function(data){
    console.log('RECV: balance:: ' + data);
});