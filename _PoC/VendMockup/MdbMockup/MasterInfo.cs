namespace MdbMockup
{
    class MasterInfo
    {
        private const byte _confData = 0x00;
        private const byte _featureLevel = 0x01;
        private const byte _columnCnt = 40;
        private const byte _rowCnt = 2;
        private const byte _displayInfo = 0x01; // Full ASCII display

        public byte[] GetAsBytes()
        {
            return new[] {_confData, _featureLevel, _columnCnt, _rowCnt, _displayInfo};
        }
    }
}
