using System.Collections.Generic;

namespace ExecMocup
{
    internal class NibbleHelper
    {
        public static KeyValuePair<int, byte> ExtractData(byte data)
        {
            const byte highOrderMask = 0xF0;
            const byte lowOrderMask = 0x0F;

            int nibbleIdx = data & highOrderMask >> 4;
            byte nibbleData = (byte) (data & lowOrderMask);

            return new KeyValuePair<int, byte>(nibbleIdx, nibbleData);
        }
    }
}
