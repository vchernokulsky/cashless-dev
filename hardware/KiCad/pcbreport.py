#!/usr/bin/env python
import sys
import re
import pcbnew
from pcbnew import*

pcb = pcbnew.GetBoard()
#print "Total PadCount %s"%pcb.GetPadCount()