var config_cmd;

var strConfig = '{"config": {"mac": "56:44:58:00:00:04", "ip": "192.168.0.5","subnet": "255.255.255.0", "gateway": "192.168.0.1", "dns": "192.168.0.1"},"host":"192.168.0.20"}\n';

var params = {
	netconfig: {
		mac: "56:44:58:0:0:04",
		ip: "192.168.0.5",
		subnet: "255.255.255.0",
	},
    host: "192.168.0.20",
};


//config_cmd = JSON.stringify(params);

//console.log("JSON config_cmd ");
//console.log(config_cmd);

var toSend = JSON.parse(strConfig);

console.log("JSON toSend ");
console.log(toSend);


//var idx = config_cmd.indexOf('\n');
//console.log("idx ");
//console.log(idx);



Serial4.setup(115200);
Serial4.write(strConfig);

