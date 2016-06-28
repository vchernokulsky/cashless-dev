using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO.Ports;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
        }

        private void OnDataReceived(object sender, SerialDataReceivedEventArgs e)
        {
            if (e.EventType == SerialData.Chars)
            {
                int msg = _serialPort.ReadByte();
                ProcessMessage(msg);
            }
        }

        public void SendMessage(byte msg)
        {
            var buffer = new[] { msg };
            _serialPort.Write(buffer, 0, buffer.Length);
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
