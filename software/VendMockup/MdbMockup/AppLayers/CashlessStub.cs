using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MdbMockup.AppLayers
{
    enum CashlessState
    {
        StateInactive,
        StateDiabled,
        StateEnabled,
        StateIdle,
        StateVend,
        StateRevalue,
        StateNegvend
    }

    enum CashlessCommand
    {
        //COMMAND_MASK      (0x07)
        Reset = 0x10 & 0x07,  // self-reset
        Setup = 0x11 & 0x07,  // setup
        Poll = 0x12 & 0x07,  // poll
        Vend = 0x13 & 0x07,  // vend
        Reader = 0x14 & 0x07,  // reader
        Revalue = 0x15 & 0x07,  // revalue
        Extra = 0x17 & 0x07   // extra
    }


    public class CashlessStub
    {
    }
}
