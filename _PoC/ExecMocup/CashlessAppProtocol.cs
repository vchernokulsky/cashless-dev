namespace ExecMocup
{
    enum ExecState
    {
        CheckStatus,
        CheckCardRead,
        ReadData,
        DecValue,
    }

    class CashlessAppProtocol
    {
        private readonly Executive _executive;
        private ExecState _state;

        public CashlessAppProtocol(Executive executive)
        {
            _executive = executive;
            _state = ExecState.CheckStatus;
        }

        public void ProcessInternalState()
        {
            switch (_state)
            {
                case ExecState.CheckStatus:
                    _executive.SendMessage(Commands.MSG_STATUS);
                    break;

                case ExecState.CheckCardRead:
                    break;

                case ExecState.ReadData:
                    break;
            }
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
                    ProcessReadDataState(msg);
                    break;
            }
        }

        public void ParityError()
        {
            switch (_state)
            {
                case ExecState.ReadData:
                    _executive.SendMessage(Commands.MSG_NAK);
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

        private ushort _cardData;
        private byte _dataCRC;
        private void ProcessReadDataState(byte msg)
        {
            var pair = NibbleHelper.ExtractData(msg);
            int idx = pair.Key;
            byte data = pair.Value;

            if (idx < 5)
            {
                AccumulateCardData(idx, data);
                _executive.SendMessage(Commands.MSG_SEND_DATA);
            }
            else
            {
                AccumulateCardData(idx, data);
                _state = ExecState.CheckStatus;
                _executive.SendMessage(Commands.MSG_STATUS);
            }
        }

        private void AccumulateCardData(int idx, byte data)
        {
            if (idx < 4)
            {
                ushort buffer = 0x0000;
                buffer = (ushort) ((buffer | data) << (idx*4));
                _cardData = (ushort) (_cardData & buffer);
            }
            else
            {
                byte buffer = 0x00;
                buffer = (byte) ((buffer | data) << ((5 - idx)*4));
                _dataCRC = (byte) (_dataCRC & buffer);
            }
        }
    }
}
