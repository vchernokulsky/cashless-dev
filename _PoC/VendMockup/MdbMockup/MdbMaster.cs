using System;
using System.Collections.Generic;
using System.IO.Ports;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MdbMockup.Common;

namespace MdbMockup
{
    public class MdbMaster
    {
        private readonly SerialPort _port;

        public MdbMaster(SerialPort port)
        {
            _port = port;
            if (_port != null)
            {
                if(!_port.IsOpen)
                    _port.Open();
            }
        }

        public void SendCommand(byte addr, byte[] data)
        {
            byte[] buffer = new byte[data.Length + 2];
            Array.Copy(new[]{addr}, buffer, 1);
            Array.Copy(data, 0, buffer, 1, data.Length);
            byte chk = ByteHelper.CalcChecksum(buffer);
            Array.Copy(new[]{chk}, 0, buffer, buffer.Length-1, 1);

            try
            {
                _port.Write(buffer, 0, buffer.Length);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }
    }
}