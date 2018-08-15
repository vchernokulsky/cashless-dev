using System;
using CashlessMockup;
using ExecMocup.Common;

namespace ExecMocup
{
    enum CashlessState
    {
        Begin,
        CardIn,
        CardLoaded
    }

    public class CashlessDevice
    {
        private CashlessState _state;

        private readonly IExecutiveBus _execBus;
        private readonly SportLifeClient _httpClient;


        public CashlessDevice(IExecutiveBus execBus)
        {
            _execBus = execBus;
            _execBus.DataReceived += OnDataReceived;

            _httpClient = new SportLifeClient();
        }

        private void OnDataReceived(object sender, byte msg)
        {
            switch (_state)
            {
                case CashlessState.Begin:
                    ProcessBeginState(msg);
                    break;
                case CashlessState.CardIn:
                    ProcessCardInState(msg);
                    break;
                case CashlessState.CardLoaded:
                    ProcessCardLoadedState(msg);
                    break;
            }
        }

        private void ProcessBeginState(byte msg)
        {
            if (msg == Commands.MSG_STATUS)
                _execBus.SendMessage(Commands.MSG_ACK);
        }

        private uint _balance;
        private void ProcessCardInState(byte msg)
        {
            switch (msg)
            {
                case Commands.MSG_STATUS:
                    _execBus.SendMessage(Commands.MSG_CARD_IN_APPERTURE);
                    break;
                case Commands.MSG_READ_CARD:
                    _execBus.SendMessage(Commands.MSG_ACK);
                    // get balance from server
                    uint balance;
                    string sBalance = _httpClient.GetUserBalance();
                    bool isNumber = UInt32.TryParse(sBalance, out balance);
                    if (isNumber)
                    {
                        _balance = balance;
                        _state = CashlessState.CardLoaded;
                    }
                    break;
            }
        }

        private void ProcessCardLoadedState(byte msg)
        {
            switch (msg)
            {
                case Commands.MSG_STATUS:
                    _execBus.SendMessage(Commands.MSG_CARD_LOADED);
                    break;
                case Commands.MSG_SEND_DATA:
                    // send balance value
                    break;
                case Commands.MSG_NAK:
                    // send last data block
                    break;
                case Commands.MSG_ACCEPT_DISPLAY_DATA:
                    break;
            }
        }
    }
}
