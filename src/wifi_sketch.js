Serial2.setup(115200, { rx: A3, tx : A2 });
var wifi = require("ESP8266WiFi_0v25").connect(Serial2, function(err) {
  //                ^^^^^^^^^^^^^^^^
  //                Use ESP8266WiFi here (and 9600 baud) if you have an ESP8266 with firmware older than 0.25
  if (err) {
    console.log("Error WiFi module connection");
    throw err;
  } else {
      wifi.reset(function(err) {
        if (err) throw err;
        console.log("Connecting to WiFi");
        wifi.connect("SauronAP","yuwb3795", function(err) {
          if (err) throw err;
          console.log("Connected");
          // Now you can do something, like an HTTP request
          require("http").get("http://www.pur3.co.uk/hello.txt", function(res) {
            console.log("Response: ",res);
            res.on('data', function(d) {
              console.log("--->"+d);
            });
          });
        });
      });    
  }
});