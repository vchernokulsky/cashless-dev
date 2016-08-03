Serial4.setup(115200);

var isLed = true;
var count = 0;
setWatch(function(){
    count++;
    isLed = !isLed;
    if(!isLed) {
        LED1.set();
    } else {
        LED1.reset();
    }
    switch (count){
        case 1: // POWERUP
            Serial4.write('PWRUP:00000000');
            console.log('SEND: POWERUP');
            break;
        case 2: // __PRICE
            Serial4.write('PRICE:00001000');
            console.log('SEND: PRICE');
            break;
        case 3: // __RESET
            Serial4.write('RESET:00000000');
            console.log('SEND: RESET');
            count = 0;
            break;
    }
}, BTN1, {
    repeat: true,
    edge: 'falling',
    debounce: 10});
    
Serial2.on('data',function(data){
    console.log('RECV: balance:: ' + data);
});