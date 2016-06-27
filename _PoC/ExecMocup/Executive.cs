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
        private ExecState _state;

        public Executive(SerialPort serialPort)
        {
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

        private void ProcessMessage(int msg)
        {
            byte bMsg = 0x00;
            if (msg > 0 && msg < 256)
                bMsg = (byte) msg;

            switch (_state)
            {
                case ExecState.CheckStatus:
                    ProcessCheckStatusState(bMsg);
                    break;

                case ExecState.CheckCardRead:
                    ProcessCardReadState(msg);
                    break;

                case ExecState.ReadData:
                    break;
            }
        }

        private void ProcessCardReadState(int msg)
        {
            switch (msg)
            {
                case Commands.MSG_ACK:
                    _serialPort.Write(new []{Commands.MSG_STATUS}, 0, 1);
                    break;

                case Commands.MSG_CARD_LOADED:
                    _serialPort.Write(new []{Commands.MSG_SEND_DATA}, 0, 1);
                    _state = ExecState.ReadData;
                    break;
            }
        }

        private void ProcessCheckStatusState(byte msg)
        {
            switch (msg)
            {
                case Commands.MSG_CARD_IN_APPERTURE:
                    _state = ExecState.CheckCardRead;
                    _serialPort.Write(new []{Commands.MSG_READ_CARD}, 0, 1);
                    break;
            }
        }
    }
}
