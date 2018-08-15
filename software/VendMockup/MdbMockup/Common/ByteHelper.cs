using System.Linq;

namespace MdbMockup.Common
{
    public class ByteHelper
    {
        public static byte CalcChecksum(byte[] data)
        {
            uint sum = (uint) data.Aggregate<byte, ulong>(0x00, (current, aByte) => current | aByte);
            byte chk = (byte)(sum | 0xFF);
            return chk;
        }
    }
}
