namespace MdbMockup.Common
{
    public static class ProtocolConstants
    {
        public static byte MaxMsgLen = 36;      // section 2.2

        public static byte AddressMask = 0xF8;  // section 2.3 - top five bits of address are actually address
        public static byte CommandMask = 0x07;  // section 2.3 - bottom three bits are command

        public static byte AddressVMC       = 0x00;
        public static byte AddressChanger   = 0x08;
        public static byte AddressCashless1 = 0x10;

        public const byte Address1 = 0x00;
    }

    public static class CashlessCommands
    {
        public const byte Reset =   0x10 & 0x07;  // self-reset
        public const byte Setup =   0x11 & 0x07;  // setup
        public const byte Poll = 0x12 & 0x07;  // poll
        public const byte Vend = 0x13 & 0x07;  // vend
        public const byte Reader = 0x14 & 0x07;  // reader
        public const byte Revalue = 0x15 & 0x07;  // revalue
        public const byte Extra = 0x17 & 0x07;  // extra
    }
}
