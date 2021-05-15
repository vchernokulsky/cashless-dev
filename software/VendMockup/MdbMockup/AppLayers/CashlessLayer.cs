using System.Diagnostics;
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

        public void ProcessInternalState()
        {
            switch (_state)
            {
                case CashlessSessionState.Setup:
                    break;

                default:
                    Debugger.Break();
                    break;
            }
            WaitForResponse();
        }

        private void SetupPeripherial()
        {
            var info = new MasterInfo();
            byte[] data = info.GetAsBytes();
            _mdbMaster.SendCommand(ProtocolConstants.AddressCashless1, data);
            _mdbMaster.WaitResponse();
        }

        private void WaitForResponse()
        {
            
            switch (_state)
            {
                case CashlessSessionState.Setup:
                    break;
            }
        }
    }
}
