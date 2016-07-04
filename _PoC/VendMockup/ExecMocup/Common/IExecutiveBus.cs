using System;

namespace ExecMocup.Common
{
    public interface IExecutiveBus
    {
        void SendMessage(byte msg);
        event EventHandler<byte> DataReceived;
    }
}
