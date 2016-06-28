Serial4.setup(9600);
Serial4.on('data', function (data) {
  console.log("<MSG>: " + data.charCodeAt(0).toString(16));
  Serial4.write([0]);
});

console.log("CPP unit started");

