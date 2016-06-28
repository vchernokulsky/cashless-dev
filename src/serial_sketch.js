Serial4.setup(9600);
Serial4.on('data', function (data) { print("<Serial4> "+data); });
Serial4.print("Hello World");