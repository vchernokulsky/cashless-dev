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
            Serial4.write('POWERUP:00000000');
            console.log('SEND: POWERUP');
            break;
        case 2: // __PRICE
            Serial4.write('__PRICE:00001000');
            console.log('SEND: __PRICE');
            break;
        case 3: // __reset   
            Serial4.write('__RESET:00000000');
            console.log('SEND: __RESET');
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