var flash = require("Flash");
var cfg = require("configurator").create();
cfg.setup(flash);


correct_config = '{"netconfig": {"mac": "56:44:58:00:00:04", "ip": "192.168.0.15","subnet": "255.255.255.0", "gateway": "192.168.0.1", "dns": "192.168.0.1"},"host":"192.168.0.5"}';
error_in_json_config = '{"netconfig": {"mac": "56:44:58:00:00:04", "ip": "192.168.0.15","subnet": "255.255.255.0", "gateway": "192.168.0.1", "dns": "192.168.0.1"},"host":"192.168.0.5"';
error_in_field_name = '{"netconfig": {"mac1": "56:44:58:00:00:04", "ip": "192.168.0.15","subnet": "255.255.255.0", "gateway": "192.168.0.1", "dns": "192.168.0.1"},"host":"192.168.0.5"}';
error_in_field_name_1 = '{"netconfig1": {"mac": "56:44:58:00:00:04", "ip": "192.168.0.15","subnet": "255.255.255.0", "gateway": "192.168.0.1", "dns": "192.168.0.1"},"host":"192.168.0.5"}';

//check correct config writing
console.log("Write correct config");
var result = cfg.saveNetworkConfig(correct_config);
console.log("CODE: " + result);

console.log("Write incorrect JSON");
result = cfg.saveNetworkConfig(error_in_json_config);
console.log("CODE: " + result);

console.log("Write incorrect field name");
result = cfg.saveNetworkConfig(error_in_field_name);
console.log("CODE: " + result);

console.log("Write incorrect field name (netconfig1)");
result = cfg.saveNetworkConfig(error_in_field_name_1);
console.log("CODE: " + result);

// check config reading
console.log('  \n');
console.log("Read CORRECT!!! config from flash");
result = cfg.loadNetworkConfig();
console.log("CODE:" + result);
console.log("HOST: " + cfg.getHost());
console.log("NETWORK CONFIG:");
console.log(cfg.getNetworkConfig());
