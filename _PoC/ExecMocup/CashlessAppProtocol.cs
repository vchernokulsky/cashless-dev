using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExecMocup
{
    class CashlessAppProtocol
    {
        private readonly Executive _executive;
        private ExecState _state;

        public CashlessAppProtocol(Executive executive)
        {
            _executive = executive;
            _state = ExecState.CheckStatus;
        }

        public void ProcessMessage(byte msg)
        {
            switch (_state)
            {
                case ExecState.CheckStatus:
                    ProcessCheckStatusState(msg);
                    break;

                case ExecState.CheckCardRead:
                    ProcessCardReadState(msg);
                    break;

                case ExecState.ReadData:
                    ProcessReadDataState();
                    break;
            }
        }

        private void ProcessCardReadState(byte msg)
        {
            switch (msg)
            {
                case Commands.MSG_ACK:
                    _executive.SendMessage(Commands.MSG_STATUS);
                    break;

                case Commands.MSG_CARD_LOADED:
                    _executive.SendMessage(Commands.MSG_SEND_DATA);
                    _state = ExecState.ReadData;
                    break;
            }
        }

        private void ProcessCheckStatusState(byte msg)
        {
            switch (msg)
            {
                case Commands.MSG_CARD_IN_APPERTURE:
                    _executive.SendMessage(Commands.MSG_READ_CARD);
                    _state = ExecState.CheckCardRead;
                    break;
            }
        }

        private void ProcessReadDataState()
        {
            
        }
    }
}
