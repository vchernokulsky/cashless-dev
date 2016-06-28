using System.IO.Ports;

namespace ExecMocup
{
    enum ExecState
    {
        CheckStatus,
        CheckCardRead,
        ReadData,
        DecValue,
    }

    internal class Executive
    {
        private readonly SerialPort _serialPort;
        private readonly CashlessAppProtocol _cashless;

        public Executive(SerialPort serialPort)
        {
            _cashless = new CashlessAppProtocol(this);

            _serialPort = serialPort;
            _serialPort.DataReceived += OnDataReceived;
            _serialPort.ErrorReceived += OnSerialError;
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
