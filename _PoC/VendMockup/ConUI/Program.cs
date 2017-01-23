using System;
using System.IO.Ports;
using ExecMocup;


namespace ConUI
{
    class Program
    {
        public static void Main(string[] args)
        {
            ushort chk = 0;
            byte[] data =
            {
                0x02, 0x64, 0x54, 0x4f, 0x55, 0x43, 0x48, 0x20, 0x43, 0x41, 0x52, 0x44, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
                0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20
            };
            for (int i = 0; i < data.Length; i++)
                chk += data[i];

            Console.WriteLine(chk & 0x00FF);
            Console.ReadKey();
        }
        /*
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
        } */
    }
}
