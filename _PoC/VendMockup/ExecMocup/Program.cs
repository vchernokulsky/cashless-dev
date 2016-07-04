using System;
using System.IO.Ports;

namespace ExecMocup
{
    class Program
    {
        static void Main(string[] args)
        {
            string portName = "COM5";//args[1];
            var serialPort = new SerialPort(portName, 9600, Parity.None, 8, StopBits.One);
            serialPort.Open();
            var executive = new Executive(serialPort);
            executive.Start();

            var keyInfo = Console.ReadKey();
            if (keyInfo.Key == ConsoleKey.Escape)
            {
                serialPort.Close();
                Environment.Exit(0);
            }
        }
    }
}
