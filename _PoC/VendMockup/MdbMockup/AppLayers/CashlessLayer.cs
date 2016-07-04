using MdbMockup.Common;

namespace MdbMockup.AppLayers
{
    enum CashlessSessionState
    {
        Setup,
        Vend,
        Poll
    }


    public class CashlessLayer
    {
        private readonly CashlessSessionState _state;
        private readonly MdbMaster _mdbMaster;

        public CashlessLayer(MdbMaster mdbMaster)
        {
            _state = CashlessSessionState.Setup;
            _mdbMaster = mdbMaster;
        }

        public void StartProcessing()
        {
            switch (_state)
            {
                case CashlessSessionState.Setup:
                    var info = new MasterInfo();
                    byte[] data = info.GetAsBytes();
                    _mdbMaster.SendCommand(ProtocolConstants.AddressCashless1, data);
                    break;
            }
            
        }

        private void WaitForResponse()
        {
            
        }
    }
}
