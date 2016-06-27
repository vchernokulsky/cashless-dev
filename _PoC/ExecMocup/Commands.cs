using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExecMocup
{
    internal class Commands
    {
        //EXECUTIVE MESSAGES
        public const byte MSG_STATUS = 0x71;
        public const byte MSG_READ_CARD = 0x72;
        public const byte MSG_SEND_DATA = 0x73;
        public const byte MSG_ACCEPT_DATA = 0x74;
        public const byte MSG_DECREMENT = 0x75;
        public const byte MSG_REINSTATE = 0x76;
        public const byte MSG_RETURN_CARD = 0x77;
        public const byte MSG_DATA_SYNC = 0x78;
        public const byte MSG_AUDIT = 0x79;
        public const byte MSG_SEND_ADDRESS = 0x7A;
        public const byte MSG_SEND_DATA_AUDIT = 0x7B;
        public const byte MSG_IDENTIFY = 0x7C;
        public const byte MSG_ACCEPT_DISPLAY_DATA = 0x7D;

        //CPP MESSAGES
        public const byte MSG_CARD_IN_APPERTURE = 0x01;
        public const byte MSG_CARD_LOADED = 0x02;

        public const byte MSG_ACK = 0x00;
        public const byte MSG_NAK = 0x7f;
        public const byte MSG_PNAK = 0xFF;
    }
}
