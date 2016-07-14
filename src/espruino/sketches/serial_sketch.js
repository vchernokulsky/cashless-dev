Serial4.setup(9600);
Serial4.on('data', function (data) {
  console.log("<MSG>: " + data.charCodeAt(0).toString(16));
  Serial4.write([0x00, 0x01]);
});

console.log("CPP unit started");

