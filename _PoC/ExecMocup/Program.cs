using System;
using System.IO.Ports;

namespace ExecMocup
{
    class Program
    {
        static void Main(string[] args)
        {
            string portName = args[1];
            var serialPort = new SerialPort(portName, 9600, Parity.None, 1);
            var executive = new Executive(serialPort);

            var keyInfo = Console.ReadKey();
            if(keyInfo.Key == ConsoleKey.Escape)
                Environment.Exit(0);
        }
    }
}
