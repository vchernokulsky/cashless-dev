using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MdbMockup.AppLayers
{
    class CashlessDevConfig
    {
        private byte _readerFeatureLevel;
        private ushort _countryCode = 0xFFFF;
        private byte _scaleFactor;
        private byte _decimalPlaces;
        private byte _appMaxRespTime;
        private byte _miscOptions;

        private static CashlessDevConfig _instance;
        public static CashlessDevConfig CreateFromMsg(byte[] data)
        {
            _instance = new CashlessDevConfig
            {
                _readerFeatureLevel = data[1],
                _scaleFactor = data[4],
                _decimalPlaces = data[5],
                _appMaxRespTime = data[6],
                _miscOptions = data[7]
            };

            _instance._countryCode |= (ushort)(data[2] << 8);
            _instance._countryCode |= data[3];

            return _instance;
        }
    }
}
