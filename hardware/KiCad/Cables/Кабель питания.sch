EESchema Schematic File Version 2
LIBS:power
LIBS:device
LIBS:transistors
LIBS:conn
LIBS:linear
LIBS:regul
LIBS:74xx
LIBS:cmos4000
LIBS:adc-dac
LIBS:memory
LIBS:xilinx
LIBS:microcontrollers
LIBS:dsp
LIBS:microchip
LIBS:analog_switches
LIBS:motorola
LIBS:texas
LIBS:intel
LIBS:audio
LIBS:interface
LIBS:digital-audio
LIBS:philips
LIBS:display
LIBS:cypress
LIBS:siliconi
LIBS:opto
LIBS:atmel
LIBS:contrib
LIBS:valves
LIBS:Mainboard
EELAYER 25 0
EELAYER END
$Descr A4 11693 8268
encoding utf-8
Sheet 1 1
Title ""
Date ""
Rev ""
Comp ""
Comment1 ""
Comment2 ""
Comment3 ""
Comment4 ""
$EndDescr
$Comp
L CONN-15F XP1
U 1 1 57AC4E87
P 2100 2900
F 0 "XP1" H 2300 4550 60  0000 C CNN
F 1 "CONN-15F" H 2350 1450 60  0000 C CNN
F 2 "" H 2100 4400 60  0000 C CNN
F 3 "" H 2100 4400 60  0000 C CNN
	1    2100 2900
	-1   0    0    -1  
$EndComp
$Comp
L CONN-15M XP2
U 1 1 57AC4EBE
P 3700 2900
F 0 "XP2" H 3900 4550 60  0000 C CNN
F 1 "CONN-15M" H 3950 1450 60  0000 C CNN
F 2 "" H 3700 4400 60  0000 C CNN
F 3 "" H 3700 4400 60  0000 C CNN
	1    3700 2900
	1    0    0    -1  
$EndComp
$Comp
L CONN-2F XP3
U 1 1 57AC519C
P 3750 4800
F 0 "XP3" H 3900 5050 60  0000 C CNN
F 1 "CONN-2F" H 3900 4550 60  0000 C CNN
F 2 "" H 3700 4900 60  0000 C CNN
F 3 "" H 3700 4900 60  0000 C CNN
	1    3750 4800
	1    0    0    -1  
$EndComp
Wire Wire Line
	2400 1400 3400 1400
Wire Wire Line
	2400 1600 3400 1600
Wire Wire Line
	3200 1400 3200 4700
Wire Wire Line
	3200 4700 3400 4700
Connection ~ 3200 1400
Wire Wire Line
	3400 4900 3000 4900
Wire Wire Line
	3000 4900 3000 1600
Connection ~ 3000 1600
Text Notes 3700 4750 0    60   ~ 0
~~24VAC
Text Notes 1750 1450 0    60   ~ 0
~~24VAC
Text Notes 1750 1650 0    60   ~ 0
~~24VAC
Text Notes 3700 1450 0    60   ~ 0
~~24VAC
Text Notes 3700 1650 0    60   ~ 0
~~24VAC
Text Notes 3700 4950 0    60   ~ 0
~~24VAC
$EndSCHEMATC
