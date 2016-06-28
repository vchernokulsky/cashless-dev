using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExecMocup
{
    internal class NibbleHelper
    {
        public static KeyValuePair<int, byte> ExtractData(byte data)
        {
            byte highOrderMask = 0xF0;
            byte lowOrderMask  = 0x0F;

            int nibbleIdx = data | highOrderMask >> 4;
            byte nibbleData = (byte) (data | lowOrderMask);

            return new KeyValuePair<int, byte>(nibbleIdx, nibbleData);
        }
    }
}
