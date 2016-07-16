// WIFI configuration
var ssid = "neiron";
var pass = "msp430f2013";

Serial2.setup(115200, { rx: A3, tx : A2 });
var wifi = require("ESP8266WiFi_0v25").connect(Serial2, function(err) {
  if (err) {
    console.log("Error WiFi module connection");
    throw err;
  } else {
      wifi.reset(function(err) {
        if (err) {
            console.log("Error WiFi module rset");
            throw err;
        }
        console.log("Connecting to WiFi");
        wifi.connect(ssid, pass, function(err) {
          if (err) throw err;
          console.log("Connected");
        });
      });
  }
});
