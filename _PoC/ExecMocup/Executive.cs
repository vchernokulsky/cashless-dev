using System;
using System.IO.Ports;
using System.Threading;

namespace ExecMocup
{
    internal class Executive
    {
        private Timer _timer;
        private readonly SerialPort _serialPort;
        private readonly CashlessAppProtocol _cashless;

        public Executive(SerialPort serialPort)
        {
            _cashless = new CashlessAppProtocol(this);

            _serialPort = serialPort;
            _serialPort.DataReceived += OnDataReceived;
            _serialPort.ErrorReceived += OnSerialError;
        }

        public void Start()
        {
            _timer = new Timer(ProcessInternalState, null, 0, 1000);
        }

        private void ProcessInternalState(object state)
        {
            _cashless.ProcessInternalState();
        }

        public void SendMessage(byte msg)
        {
            var buffer = new[] { msg };
            _serialPort.Write(buffer, 0, buffer.Length);
        }

        private void OnDataReceived(object sender, SerialDataReceivedEventArgs e)
        {
            if (e.EventType == SerialData.Chars)
            {
                int msg = _serialPort.ReadByte();
                Console.WriteLine("<MSG:> " + msg);
                ProcessMessage(msg);
            }
        }

        private void OnSerialError(object sender, SerialErrorReceivedEventArgs e)
        {
            if (e.EventType == SerialError.RXParity)
            {
                _cashless.ParityError();
            }
        }

        private void ProcessMessage(int msg)
        {
            if (msg > 0 && msg < 256)
            {
                byte bMsg = (byte) msg;
                _cashless.ProcessMessage(bMsg);
            }
        }
    }
}
