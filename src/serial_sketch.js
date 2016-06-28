Serial4.setup(9600);

Serial4.on('data', function (data) {
  console.log("<MSG>: " + data);
  Serial4.write([0]);
});